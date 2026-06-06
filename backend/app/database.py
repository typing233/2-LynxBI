from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text, inspect
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def _migrate_datasources_user_id(conn):
    """Add user_id column to datasources if missing (legacy DB compatibility)."""
    def _check_column(sync_conn):
        insp = inspect(sync_conn)
        columns = [c["name"] for c in insp.get_columns("datasources")]
        return "user_id" in columns

    # Only run if datasources table exists
    def _table_exists(sync_conn):
        insp = inspect(sync_conn)
        return "datasources" in insp.get_table_names()

    if not await conn.run_sync(_table_exists):
        return

    has_column = await conn.run_sync(_check_column)
    if has_column:
        return

    # Add the column as nullable first
    await conn.execute(text("ALTER TABLE datasources ADD COLUMN user_id INTEGER"))

    # Check if users table exists and has rows
    def _users_table_exists(sync_conn):
        insp = inspect(sync_conn)
        return "users" in insp.get_table_names()

    if await conn.run_sync(_users_table_exists):
        # Assign orphan datasources to the first user if one exists
        result = await conn.execute(text("SELECT id FROM users ORDER BY id LIMIT 1"))
        first_user = result.scalar_one_or_none()
        if first_user:
            await conn.execute(
                text("UPDATE datasources SET user_id = :uid WHERE user_id IS NULL"),
                {"uid": first_user},
            )


async def init_db():
    import app.models  # noqa: F401 - ensure all models are registered
    async with engine.begin() as conn:
        # Run schema migration for legacy databases before create_all
        await _migrate_datasources_user_id(conn)
        await conn.run_sync(Base.metadata.create_all)
