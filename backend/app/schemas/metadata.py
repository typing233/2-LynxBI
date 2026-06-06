from pydantic import BaseModel


class TableInfo(BaseModel):
    schema_name: str | None
    table_name: str


class ColumnInfo(BaseModel):
    column_name: str
    data_type: str
    is_nullable: bool
    is_primary_key: bool
    column_order: int


class MetadataSyncResponse(BaseModel):
    datasource_id: int
    tables_count: int
    message: str
