from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.models.datasource import DataSource
from app.schemas.query import QueryRequest, QueryPreviewResponse, QueryExecuteResponse
from app.services.connection_manager import connection_manager
from app.services.query_builder import build_query, compile_sql

router = APIRouter()

MAX_ROWS = 10000


async def _get_engine(datasource_id: int, db: AsyncSession):
    ds = await db.get(DataSource, datasource_id)
    if not ds:
        raise HTTPException(status_code=404, detail="DataSource not found")
    return connection_manager.get_engine(
        ds.id, ds.db_type, ds.host, ds.port,
        ds.database, ds.username, ds.encrypted_password, ds.pool_size
    )


@router.post("/preview", response_model=QueryPreviewResponse)
async def preview_query(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    engine = await _get_engine(request.datasource_id, db)
    stmt = build_query(request, engine)
    sql = compile_sql(stmt, engine)
    return QueryPreviewResponse(sql=sql)


@router.post("/execute", response_model=QueryExecuteResponse)
async def execute_query(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    if request.limit and request.limit > MAX_ROWS:
        request.limit = MAX_ROWS

    engine = await _get_engine(request.datasource_id, db)
    stmt = build_query(request, engine)
    sql = compile_sql(stmt, engine)

    try:
        async with engine.connect() as conn:
            result = await conn.execute(text(sql))
            columns = list(result.keys())
            rows = [dict(zip(columns, row)) for row in result.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")

    return QueryExecuteResponse(
        sql=sql,
        columns=columns,
        rows=rows,
        row_count=len(rows),
    )
