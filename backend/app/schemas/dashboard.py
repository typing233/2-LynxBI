from pydantic import BaseModel
from typing import Any


class DashboardItemCreate(BaseModel):
    chart_id: int
    x: int = 0
    y: int = 0
    w: int = 6
    h: int = 4


class DashboardItemResponse(BaseModel):
    id: int
    dashboard_id: int
    chart_id: int
    x: int
    y: int
    w: int
    h: int

    class Config:
        from_attributes = True


class DashboardCreate(BaseModel):
    name: str
    description: str | None = None
    filters_config: dict[str, Any] | None = None
    refresh_interval: int | None = None


class DashboardUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    filters_config: dict[str, Any] | None = None
    refresh_interval: int | None = None


class LayoutItem(BaseModel):
    id: int
    x: int
    y: int
    w: int
    h: int


class DashboardLayoutUpdate(BaseModel):
    items: list[LayoutItem]


class DashboardResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: str | None
    filters_config: dict[str, Any] | None
    refresh_interval: int | None
    items: list[DashboardItemResponse] = []
    created_at: str | None = None
    updated_at: str | None = None

    class Config:
        from_attributes = True


class ShareLinkResponse(BaseModel):
    id: int
    dashboard_id: int
    token: str
    is_enabled: bool
    created_at: str | None = None

    class Config:
        from_attributes = True


class ShareLinkToggle(BaseModel):
    is_enabled: bool
