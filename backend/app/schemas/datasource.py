from pydantic import BaseModel
from datetime import datetime


class DataSourceBase(BaseModel):
    name: str
    db_type: str
    host: str
    port: int
    database: str
    username: str
    pool_size: int = 5


class DataSourceCreate(DataSourceBase):
    password: str


class DataSourceUpdate(BaseModel):
    name: str | None = None
    host: str | None = None
    port: int | None = None
    database: str | None = None
    username: str | None = None
    password: str | None = None
    pool_size: int | None = None


class DataSourceResponse(DataSourceBase):
    id: int
    created_at: datetime | None
    updated_at: datetime | None
    sync_warning: str | None = None

    class Config:
        from_attributes = True
