import json
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.dashboard import Dashboard, DashboardItem, ShareLink
from app.models.chart import Chart
from app.models.user import User
from app.schemas.dashboard import (
    DashboardCreate, DashboardUpdate, DashboardResponse,
    DashboardItemCreate, DashboardItemResponse,
    DashboardLayoutUpdate, ShareLinkResponse, ShareLinkToggle,
)
from app.schemas.chart import ChartResponse
from app.dependencies import get_current_user

router = APIRouter()


async def _build_dashboard_response(dashboard: Dashboard, db: AsyncSession) -> DashboardResponse:
    result = await db.execute(
        select(DashboardItem).where(DashboardItem.dashboard_id == dashboard.id)
    )
    items = result.scalars().all()
    return DashboardResponse(
        id=dashboard.id,
        user_id=dashboard.user_id,
        name=dashboard.name,
        description=dashboard.description,
        filters_config=json.loads(dashboard.filters_config) if dashboard.filters_config else None,
        refresh_interval=dashboard.refresh_interval,
        items=[DashboardItemResponse(
            id=item.id, dashboard_id=item.dashboard_id,
            chart_id=item.chart_id, x=item.x, y=item.y, w=item.w, h=item.h,
        ) for item in items],
        created_at=str(dashboard.created_at) if dashboard.created_at else None,
        updated_at=str(dashboard.updated_at) if dashboard.updated_at else None,
    )


@router.get("", response_model=list[DashboardResponse])
async def list_dashboards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dashboard).where(Dashboard.user_id == current_user.id).order_by(Dashboard.updated_at.desc())
    )
    dashboards = result.scalars().all()
    return [await _build_dashboard_response(d, db) for d in dashboards]


@router.post("", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    data: DashboardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    dashboard = Dashboard(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        filters_config=json.dumps(data.filters_config) if data.filters_config else None,
        refresh_interval=data.refresh_interval,
    )
    db.add(dashboard)
    await db.commit()
    await db.refresh(dashboard)
    return await _build_dashboard_response(dashboard, db)


@router.get("/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return await _build_dashboard_response(dashboard, db)


@router.put("/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(
    dashboard_id: int,
    data: DashboardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if data.name is not None:
        dashboard.name = data.name
    if data.description is not None:
        dashboard.description = data.description
    if data.filters_config is not None:
        dashboard.filters_config = json.dumps(data.filters_config)
    if data.refresh_interval is not None:
        dashboard.refresh_interval = data.refresh_interval
    await db.commit()
    await db.refresh(dashboard)
    return await _build_dashboard_response(dashboard, db)


@router.delete("/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    await db.delete(dashboard)
    await db.commit()


@router.post("/{dashboard_id}/items", response_model=DashboardItemResponse, status_code=status.HTTP_201_CREATED)
async def add_dashboard_item(
    dashboard_id: int,
    data: DashboardItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Dashboard not found")
    item = DashboardItem(
        dashboard_id=dashboard_id,
        chart_id=data.chart_id,
        x=data.x, y=data.y, w=data.w, h=data.h,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return DashboardItemResponse(
        id=item.id, dashboard_id=item.dashboard_id,
        chart_id=item.chart_id, x=item.x, y=item.y, w=item.w, h=item.h,
    )


@router.delete("/{dashboard_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_dashboard_item(
    dashboard_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Dashboard not found")
    result = await db.execute(
        select(DashboardItem).where(DashboardItem.id == item_id, DashboardItem.dashboard_id == dashboard_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()


@router.put("/{dashboard_id}/layout", response_model=DashboardResponse)
async def update_layout(
    dashboard_id: int,
    data: DashboardLayoutUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    for layout_item in data.items:
        result = await db.execute(
            select(DashboardItem).where(
                DashboardItem.id == layout_item.id,
                DashboardItem.dashboard_id == dashboard_id,
            )
        )
        item = result.scalar_one_or_none()
        if item:
            item.x = layout_item.x
            item.y = layout_item.y
            item.w = layout_item.w
            item.h = layout_item.h
    await db.commit()
    await db.refresh(dashboard)
    return await _build_dashboard_response(dashboard, db)


# --- Share Links ---

@router.post("/{dashboard_id}/share", response_model=ShareLinkResponse)
async def create_share_link(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Dashboard not found")
    # Return existing link if one exists
    result = await db.execute(
        select(ShareLink).where(ShareLink.dashboard_id == dashboard_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return ShareLinkResponse(
            id=existing.id, dashboard_id=existing.dashboard_id,
            token=existing.token, is_enabled=existing.is_enabled,
            created_at=str(existing.created_at) if existing.created_at else None,
        )
    link = ShareLink(
        dashboard_id=dashboard_id,
        token=secrets.token_urlsafe(32),
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return ShareLinkResponse(
        id=link.id, dashboard_id=link.dashboard_id,
        token=link.token, is_enabled=link.is_enabled,
        created_at=str(link.created_at) if link.created_at else None,
    )


@router.put("/{dashboard_id}/share", response_model=ShareLinkResponse)
async def toggle_share_link(
    dashboard_id: int,
    data: ShareLinkToggle,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Dashboard not found")
    result = await db.execute(
        select(ShareLink).where(ShareLink.dashboard_id == dashboard_id)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")
    link.is_enabled = data.is_enabled
    await db.commit()
    await db.refresh(link)
    return ShareLinkResponse(
        id=link.id, dashboard_id=link.dashboard_id,
        token=link.token, is_enabled=link.is_enabled,
        created_at=str(link.created_at) if link.created_at else None,
    )
