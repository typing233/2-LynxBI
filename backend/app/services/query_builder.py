from sqlalchemy import Column as SAColumn, Table, MetaData, select, func, String, Integer
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from sqlalchemy.sql import quoted_name
from sqlalchemy import select as sa_select
from app.schemas.query import QueryRequest
from app.models.metadata_cache import MetadataTable, MetadataColumn

AGGREGATE_FUNCTIONS = {
    "COUNT": func.count,
    "SUM": func.sum,
    "AVG": func.avg,
    "MIN": func.min,
    "MAX": func.max,
}

OPERATORS = {
    "=": lambda col, val: col == val,
    "!=": lambda col, val: col != val,
    ">": lambda col, val: col > val,
    "<": lambda col, val: col < val,
    ">=": lambda col, val: col >= val,
    "<=": lambda col, val: col <= val,
    "LIKE": lambda col, val: col.like(val),
    "NOT LIKE": lambda col, val: col.not_like(val),
    "IN": lambda col, val: col.in_(val if isinstance(val, list) else [val]),
    "NOT IN": lambda col, val: col.not_in(val if isinstance(val, list) else [val]),
    "IS NULL": lambda col, val: col.is_(None),
    "IS NOT NULL": lambda col, val: col.isnot(None),
}


async def validate_and_build(request: QueryRequest, engine: AsyncEngine, db: AsyncSession):
    """Validate table/fields against synced metadata, then build a safe SQL statement."""

    # Fetch allowed table from metadata
    result = await db.execute(
        sa_select(MetadataTable).where(
            MetadataTable.datasource_id == request.datasource_id,
            MetadataTable.table_name == request.table,
        )
    )
    meta_table = result.scalar_one_or_none()
    if not meta_table:
        raise ValueError(
            f"Table '{request.table}' not found in synced metadata. "
            "Please sync metadata first."
        )

    # Fetch allowed columns for this table
    col_result = await db.execute(
        sa_select(MetadataColumn).where(MetadataColumn.table_id == meta_table.id)
    )
    allowed_columns = {c.column_name for c in col_result.scalars().all()}

    # Validate all referenced field names
    referenced_fields = set()
    for f in request.fields:
        referenced_fields.add(f.name)
    for f in request.filters:
        referenced_fields.add(f.field)
    for g in request.group_by:
        referenced_fields.add(g)
    for o in request.order_by:
        referenced_fields.add(o.field)

    invalid = referenced_fields - allowed_columns
    if invalid:
        raise ValueError(
            f"Fields not found in table '{request.table}': {sorted(invalid)}. "
            "Please sync metadata to update available fields."
        )

    # Build a proper SQLAlchemy Table with quoted identifiers
    metadata = MetaData()
    sa_table = Table(
        request.table, metadata,
        *[SAColumn(col_name, String) for col_name in allowed_columns],
        quote=True,
    )

    # Resolve column references (always properly quoted via SA Column objects)
    def get_col(name: str):
        return sa_table.c[name]

    # Build SELECT columns
    columns = []
    for field in request.fields:
        col = get_col(field.name)
        if field.aggregate and field.aggregate.upper() in AGGREGATE_FUNCTIONS:
            agg_func = AGGREGATE_FUNCTIONS[field.aggregate.upper()]
            col = agg_func(col)
        if field.alias:
            col = col.label(field.alias)
        elif field.aggregate:
            col = col.label(f"{field.aggregate.lower()}_{field.name}")
        columns.append(col)

    if not columns:
        columns = [sa_table]

    stmt = select(*columns).select_from(sa_table)

    # WHERE filters
    for f in request.filters:
        col = get_col(f.field)
        op = f.operator.upper()
        if op in OPERATORS:
            stmt = stmt.where(OPERATORS[op](col, f.value))

    # GROUP BY
    if request.group_by:
        stmt = stmt.group_by(*[get_col(g) for g in request.group_by])

    # ORDER BY
    for ob in request.order_by:
        col = get_col(ob.field)
        if ob.aggregate and ob.aggregate.upper() in AGGREGATE_FUNCTIONS:
            agg_func = AGGREGATE_FUNCTIONS[ob.aggregate.upper()]
            col = agg_func(col)
        if ob.direction.upper() == "DESC":
            col = col.desc()
        else:
            col = col.asc()
        stmt = stmt.order_by(col)

    # LIMIT
    if request.limit:
        stmt = stmt.limit(request.limit)

    return stmt


def compile_sql(stmt, engine: AsyncEngine) -> str:
    dialect = engine.dialect
    compiled = stmt.compile(dialect=dialect, compile_kwargs={"literal_binds": True})
    return str(compiled)
