import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.chart import Chart
from app.models.datasource import DataSource
from app.models.user import User
from app.schemas.chart import ChartCreate, ChartUpdate, ChartResponse
from app.dependencies import get_current_user

router = APIRouter()


def _chart_to_response(chart: Chart) -> ChartResponse:
    return ChartResponse(
        id=chart.id,
        user_id=chart.user_id,
        name=chart.name,
        chart_type=chart.chart_type,
        datasource_id=chart.datasource_id,
        query_config=json.loads(chart.query_config),
        chart_config=json.loads(chart.chart_config),
        created_at=str(chart.created_at) if chart.created_at else None,
        updated_at=str(chart.updated_at) if chart.updated_at else None,
    )


@router.get("", response_model=list[ChartResponse])
async def list_charts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chart).where(Chart.user_id == current_user.id).order_by(Chart.updated_at.desc())
    )
    return [_chart_to_response(c) for c in result.scalars().all()]


@router.post("", response_model=ChartResponse, status_code=status.HTTP_201_CREATED)
async def create_chart(
    data: ChartCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify datasource belongs to current user
    result = await db.execute(
        select(DataSource).where(DataSource.id == data.datasource_id, DataSource.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="DataSource not found or not owned by you")
    chart = Chart(
        user_id=current_user.id,
        name=data.name,
        chart_type=data.chart_type,
        datasource_id=data.datasource_id,
        query_config=json.dumps(data.query_config),
        chart_config=json.dumps(data.chart_config),
    )
    db.add(chart)
    await db.commit()
    await db.refresh(chart)
    return _chart_to_response(chart)


@router.get("/{chart_id}", response_model=ChartResponse)
async def get_chart(
    chart_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chart).where(Chart.id == chart_id, Chart.user_id == current_user.id)
    )
    chart = result.scalar_one_or_none()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    return _chart_to_response(chart)


@router.put("/{chart_id}", response_model=ChartResponse)
async def update_chart(
    chart_id: int,
    data: ChartUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chart).where(Chart.id == chart_id, Chart.user_id == current_user.id)
    )
    chart = result.scalar_one_or_none()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    if data.name is not None:
        chart.name = data.name
    if data.chart_type is not None:
        chart.chart_type = data.chart_type
    if data.datasource_id is not None:
        # Verify new datasource belongs to current user
        ds_result = await db.execute(
            select(DataSource).where(DataSource.id == data.datasource_id, DataSource.user_id == current_user.id)
        )
        if not ds_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="DataSource not found or not owned by you")
        chart.datasource_id = data.datasource_id
    if data.query_config is not None:
        chart.query_config = json.dumps(data.query_config)
    if data.chart_config is not None:
        chart.chart_config = json.dumps(data.chart_config)
    await db.commit()
    await db.refresh(chart)
    return _chart_to_response(chart)


@router.delete("/{chart_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chart(
    chart_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chart).where(Chart.id == chart_id, Chart.user_id == current_user.id)
    )
    chart = result.scalar_one_or_none()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    await db.delete(chart)
    await db.commit()
