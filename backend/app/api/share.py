import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select as sa_select
from app.database import get_db
from app.models.dashboard import Dashboard, DashboardItem, ShareLink
from app.models.chart import Chart
from app.models.datasource import DataSource
from app.schemas.query import QueryRequest, QueryField, QueryFilter, QueryOrderBy
from app.services.connection_manager import connection_manager
from app.services.query_builder import validate_and_build, compile_sql

router = APIRouter()


@router.get("/{token}")
async def get_shared_dashboard(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(sa_select(ShareLink).where(ShareLink.token == token))
    link = result.scalar_one_or_none()
    if not link or not link.is_enabled:
        raise HTTPException(status_code=404, detail="Share link not found or disabled")

    result = await db.execute(sa_select(Dashboard).where(Dashboard.id == link.dashboard_id))
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    result = await db.execute(
        sa_select(DashboardItem).where(DashboardItem.dashboard_id == dashboard.id)
    )
    items = result.scalars().all()

    charts_data = []
    for item in items:
        result = await db.execute(
            sa_select(Chart).where(Chart.id == item.chart_id, Chart.user_id == dashboard.user_id)
        )
        chart = result.scalar_one_or_none()
        if chart:
            charts_data.append({
                "item_id": item.id,
                "chart_id": chart.id,
                "name": chart.name,
                "chart_type": chart.chart_type,
                "datasource_id": chart.datasource_id,
                "query_config": json.loads(chart.query_config),
                "chart_config": json.loads(chart.chart_config),
                "layout": {"x": item.x, "y": item.y, "w": item.w, "h": item.h},
            })

    return {
        "id": dashboard.id,
        "name": dashboard.name,
        "description": dashboard.description,
        "filters_config": json.loads(dashboard.filters_config) if dashboard.filters_config else None,
        "refresh_interval": dashboard.refresh_interval,
        "charts": charts_data,
    }


@router.post("/{token}/query")
async def execute_shared_query(token: str, body: dict, db: AsyncSession = Depends(get_db)):
    """Execute a query for a chart in a shared dashboard, with dashboard-level filters."""
    result = await db.execute(sa_select(ShareLink).where(ShareLink.token == token))
    link = result.scalar_one_or_none()
    if not link or not link.is_enabled:
        raise HTTPException(status_code=404, detail="Share link not found or disabled")

    # Get dashboard to verify owner
    result = await db.execute(sa_select(Dashboard).where(Dashboard.id == link.dashboard_id))
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    chart_id = body.get("chart_id")
    extra_filters = body.get("filters", [])

    result = await db.execute(
        sa_select(DashboardItem).where(
            DashboardItem.dashboard_id == link.dashboard_id,
            DashboardItem.chart_id == chart_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Chart not in this dashboard")

    # Only allow charts owned by the dashboard owner
    result = await db.execute(
        sa_select(Chart).where(Chart.id == chart_id, Chart.user_id == dashboard.user_id)
    )
    chart = result.scalar_one_or_none()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    query_config = json.loads(chart.query_config)
    filters = query_config.get("filters", [])
    if extra_filters:
        filters.extend(extra_filters)

    result = await db.execute(sa_select(DataSource).where(DataSource.id == chart.datasource_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")

    engine = connection_manager.get_engine(
        datasource.id, datasource.db_type, datasource.host, datasource.port,
        datasource.database, datasource.username, datasource.encrypted_password,
        datasource.pool_size,
    )

    request = QueryRequest(
        datasource_id=datasource.id,
        table=query_config["table"],
        fields=[QueryField(**f) for f in query_config.get("fields", [])],
        filters=[QueryFilter(**f) for f in filters],
        group_by=query_config.get("group_by", []),
        order_by=[QueryOrderBy(**o) for o in query_config.get("order_by", [])],
        limit=query_config.get("limit", 1000),
    )

    try:
        stmt = await validate_and_build(request, engine, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        async with engine.connect() as conn:
            result = await conn.execute(stmt)
            columns = list(result.keys())
            rows = [dict(zip(columns, row)) for row in result.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")

    return {
        "columns": columns,
        "rows": rows,
        "row_count": len(rows),
    }
