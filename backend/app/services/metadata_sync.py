from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.metadata_cache import MetadataTable, MetadataColumn
from app.models.datasource import DataSource
from app.services.connection_manager import connection_manager


async def sync_metadata(datasource_id: int, db: AsyncSession) -> int:
    ds = await db.get(DataSource, datasource_id)
    if not ds:
        raise ValueError("DataSource not found")

    engine = connection_manager.get_engine(
        ds.id, ds.db_type, ds.host, ds.port,
        ds.database, ds.username, ds.encrypted_password, ds.pool_size
    )

    # Clear existing metadata for this datasource
    existing_tables = await db.execute(
        select(MetadataTable).where(MetadataTable.datasource_id == datasource_id)
    )
    for table in existing_tables.scalars().all():
        await db.execute(delete(MetadataColumn).where(MetadataColumn.table_id == table.id))
    await db.execute(delete(MetadataTable).where(MetadataTable.datasource_id == datasource_id))

    tables_count = 0

    async with engine.connect() as conn:
        # Use run_sync to call synchronous inspect
        def _inspect(sync_conn):
            insp = inspect(sync_conn)
            tables_data = []
            schema = insp.default_schema_name

            for table_name in insp.get_table_names(schema=schema):
                columns = insp.get_columns(table_name, schema=schema)
                pk_cols = set()
                try:
                    pk = insp.get_pk_constraint(table_name, schema=schema)
                    pk_cols = set(pk.get("constrained_columns", []))
                except Exception:
                    pass

                tables_data.append({
                    "schema": schema,
                    "table_name": table_name,
                    "columns": [
                        {
                            "name": col["name"],
                            "type": str(col["type"]),
                            "nullable": col.get("nullable", True),
                            "is_pk": col["name"] in pk_cols,
                            "order": idx,
                        }
                        for idx, col in enumerate(columns)
                    ]
                })
            return tables_data

        tables_data = await conn.run_sync(_inspect)

    for tdata in tables_data:
        meta_table = MetadataTable(
            datasource_id=datasource_id,
            schema_name=tdata["schema"],
            table_name=tdata["table_name"],
        )
        db.add(meta_table)
        await db.flush()

        for col in tdata["columns"]:
            meta_col = MetadataColumn(
                table_id=meta_table.id,
                column_name=col["name"],
                data_type=col["type"],
                is_nullable=col["nullable"],
                is_primary_key=col["is_pk"],
                column_order=col["order"],
            )
            db.add(meta_col)

        tables_count += 1

    await db.commit()
    return tables_count
