from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy import text
from urllib.parse import quote_plus
from app.utils.security import decrypt_password


class ConnectionManager:
    def __init__(self):
        self._engines: dict[int, AsyncEngine] = {}

    def _build_url(self, db_type: str, host: str, port: int, database: str, username: str, password: str) -> str:
        encoded_password = quote_plus(password)
        if db_type == "postgresql":
            return f"postgresql+asyncpg://{username}:{encoded_password}@{host}:{port}/{database}"
        elif db_type == "mysql":
            return f"mysql+aiomysql://{username}:{encoded_password}@{host}:{port}/{database}?charset=utf8mb4"
        raise ValueError(f"Unsupported database type: {db_type}")

    def get_engine(self, datasource_id: int, db_type: str, host: str, port: int,
                   database: str, username: str, encrypted_password: str, pool_size: int = 5) -> AsyncEngine:
        if datasource_id not in self._engines:
            password = decrypt_password(encrypted_password)
            url = self._build_url(db_type, host, port, database, username, password)
            self._engines[datasource_id] = create_async_engine(
                url, pool_size=pool_size, max_overflow=pool_size, pool_pre_ping=False,
                pool_recycle=3600,
            )
        return self._engines[datasource_id]

    async def test_connection(self, db_type: str, host: str, port: int,
                              database: str, username: str, password: str) -> bool:
        url = self._build_url(db_type, host, port, database, username, password)
        engine = create_async_engine(url, pool_size=1, max_overflow=0)
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        finally:
            await engine.dispose()

    async def remove_engine(self, datasource_id: int):
        if datasource_id in self._engines:
            await self._engines[datasource_id].dispose()
            del self._engines[datasource_id]

    async def dispose_all(self):
        for engine in self._engines.values():
            await engine.dispose()
        self._engines.clear()


connection_manager = ConnectionManager()
