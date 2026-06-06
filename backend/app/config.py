from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "LynxBI"
    database_url: str = "sqlite+aiosqlite:///./lynxbi.db"
    secret_key: str = "change-this-in-production-use-a-real-secret-key"
    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
