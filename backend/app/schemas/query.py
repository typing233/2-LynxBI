from pydantic import BaseModel
from typing import Any


class QueryField(BaseModel):
    name: str
    aggregate: str | None = None
    alias: str | None = None


class QueryFilter(BaseModel):
    field: str
    operator: str
    value: Any = None


class QueryOrderBy(BaseModel):
    field: str
    direction: str = "ASC"
    aggregate: str | None = None


class QueryRequest(BaseModel):
    datasource_id: int
    table: str
    fields: list[QueryField] = []
    filters: list[QueryFilter] = []
    group_by: list[str] = []
    order_by: list[QueryOrderBy] = []
    limit: int = 100


class QueryPreviewResponse(BaseModel):
    sql: str


class QueryExecuteResponse(BaseModel):
    sql: str
    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int
