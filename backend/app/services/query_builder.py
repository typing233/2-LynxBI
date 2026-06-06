from sqlalchemy import Table, MetaData, Column as SAColumn, select, func, text, literal_column
from sqlalchemy.ext.asyncio import AsyncEngine
from app.schemas.query import QueryRequest, QueryField, QueryFilter

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


def build_query(request: QueryRequest, engine: AsyncEngine):
    metadata = MetaData()
    table = Table(request.table, metadata, autoload_with=None)

    # We'll build a raw column-based select since we don't have reflected metadata here
    # Instead, use text-based column references with proper quoting via literal_column
    columns = []
    for field in request.fields:
        col = literal_column(field.name)
        if field.aggregate and field.aggregate.upper() in AGGREGATE_FUNCTIONS:
            agg_func = AGGREGATE_FUNCTIONS[field.aggregate.upper()]
            col = agg_func(col)
        if field.alias:
            col = col.label(field.alias)
        elif field.aggregate:
            col = col.label(f"{field.aggregate.lower()}_{field.name}")
        columns.append(col)

    if not columns:
        columns = [literal_column("*")]

    stmt = select(*columns).select_from(text(request.table))

    # Filters
    for f in request.filters:
        col = literal_column(f.field)
        op = f.operator.upper()
        if op in OPERATORS:
            stmt = stmt.where(OPERATORS[op](col, f.value))

    # Group by
    if request.group_by:
        stmt = stmt.group_by(*[literal_column(g) for g in request.group_by])

    # Order by
    for ob in request.order_by:
        col = literal_column(ob.field)
        if ob.aggregate and ob.aggregate.upper() in AGGREGATE_FUNCTIONS:
            agg_func = AGGREGATE_FUNCTIONS[ob.aggregate.upper()]
            col = agg_func(col)
        if ob.direction.upper() == "DESC":
            col = col.desc()
        else:
            col = col.asc()
        stmt = stmt.order_by(col)

    # Limit
    if request.limit:
        stmt = stmt.limit(request.limit)

    return stmt


def compile_sql(stmt, engine: AsyncEngine) -> str:
    dialect = engine.dialect
    compiled = stmt.compile(dialect=dialect, compile_kwargs={"literal_binds": True})
    return str(compiled)
