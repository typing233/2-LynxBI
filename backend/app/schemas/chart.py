from pydantic import BaseModel
from typing import Any


class ChartCreate(BaseModel):
    name: str
    chart_type: str
    datasource_id: int
    query_config: dict[str, Any]
    chart_config: dict[str, Any]


class ChartUpdate(BaseModel):
    name: str | None = None
    chart_type: str | None = None
    datasource_id: int | None = None
    query_config: dict[str, Any] | None = None
    chart_config: dict[str, Any] | None = None


class ChartResponse(BaseModel):
    id: int
    user_id: int
    name: str
    chart_type: str
    datasource_id: int | None
    query_config: dict[str, Any]
    chart_config: dict[str, Any]
    created_at: str | None = None
    updated_at: str | None = None

    class Config:
        from_attributes = True
