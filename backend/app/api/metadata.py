from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.datasource import DataSource
from app.models.metadata_cache import MetadataTable, MetadataColumn
from app.models.user import User
from app.schemas.metadata import TableInfo, ColumnInfo, MetadataSyncResponse
from app.services.metadata_sync import sync_metadata
from app.dependencies import get_current_user

router = APIRouter()


async def _verify_datasource_owner(datasource_id: int, user: User, db: AsyncSession) -> DataSource:
    result = await db.execute(
        select(DataSource).where(DataSource.id == datasource_id, DataSource.user_id == user.id)
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=404, detail="DataSource not found")
    return ds


@router.post("/sync/{datasource_id}", response_model=MetadataSyncResponse)
async def sync_datasource_metadata(
    datasource_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_datasource_owner(datasource_id, current_user, db)
    try:
        count = await sync_metadata(datasource_id, db)
        return MetadataSyncResponse(
            datasource_id=datasource_id,
            tables_count=count,
            message=f"Successfully synced {count} tables",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/{datasource_id}/tables", response_model=list[TableInfo])
async def get_tables(
    datasource_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_datasource_owner(datasource_id, current_user, db)
    result = await db.execute(
        select(MetadataTable)
        .where(MetadataTable.datasource_id == datasource_id)
        .order_by(MetadataTable.table_name)
    )
    tables = result.scalars().all()
    return [TableInfo(schema_name=t.schema_name, table_name=t.table_name) for t in tables]


@router.get("/{datasource_id}/tables/{table_name}/columns", response_model=list[ColumnInfo])
async def get_columns(
    datasource_id: int,
    table_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_datasource_owner(datasource_id, current_user, db)
    result = await db.execute(
        select(MetadataTable)
        .where(MetadataTable.datasource_id == datasource_id, MetadataTable.table_name == table_name)
    )
    meta_table = result.scalar_one_or_none()
    if not meta_table:
        raise HTTPException(status_code=404, detail="Table not found in metadata cache. Run sync first.")

    cols_result = await db.execute(
        select(MetadataColumn)
        .where(MetadataColumn.table_id == meta_table.id)
        .order_by(MetadataColumn.column_order)
    )
    columns = cols_result.scalars().all()
    return [
        ColumnInfo(
            column_name=c.column_name,
            data_type=c.data_type,
            is_nullable=c.is_nullable,
            is_primary_key=c.is_primary_key,
            column_order=c.column_order,
        )
        for c in columns
    ]
