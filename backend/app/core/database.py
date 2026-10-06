import logging
from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

logger = logging.getLogger(__name__)


def normalize_database_url(url: str) -> str:
    """
    Normalizes database connection URLs:
    - postgres:// -> postgresql+asyncpg://
    - postgresql:// (without async driver) -> postgresql+asyncpg://
    - Translates libpq sslmode=require to asyncpg-friendly ssl=require
    """
    if not url:
        return url

    normalized = url
    if normalized.startswith("postgres://"):
        normalized = normalized.replace("postgres://", "postgresql+asyncpg://", 1)
    elif normalized.startswith("postgresql://") and not normalized.startswith("postgresql+"):
        normalized = normalized.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Supabase connection strings often include ?sslmode=require
    # asyncpg expects ssl=require rather than libpq sslmode parameter
    if "sslmode=require" in normalized:
        normalized = normalized.replace("sslmode=require", "ssl=require")

    return normalized


def get_connect_args(url: str) -> dict[str, Any]:
    """
    Constructs driver-specific connect_args for SQLite and PostgreSQL/asyncpg.
    """
    connect_args: dict[str, Any] = {}
    if "sqlite" in url:
        connect_args["check_same_thread"] = False
    elif "postgresql" in url or "asyncpg" in url:
        # Supabase transaction/session pooler (port 6543 / 5432 / pooler.supabase.com)
        # requires statement_cache_size=0 with asyncpg to prevent prepared statement errors
        if ":6543" in url or ":5432" in url or "pooler.supabase.com" in url or "pgbouncer" in url.lower():
            connect_args["statement_cache_size"] = 0

        # Enforce SSL requirement if specified in URL or if remote Supabase host
        if (
            "ssl=require" in url
            or "sslmode=require" in url
            or "supabase.co" in url
            or "supabase.com" in url
        ):
            connect_args["ssl"] = "require"

    return connect_args


def get_engine_kwargs(url: str, is_dev: bool = True) -> dict[str, Any]:
    """
    Constructs create_async_engine keyword arguments.
    Configures connection pooling for PostgreSQL while respecting SQLite defaults.
    """
    connect_args = get_connect_args(url)
    kwargs: dict[str, Any] = {
        "echo": settings.DEBUG and is_dev,
        "connect_args": connect_args,
        "pool_pre_ping": True,
    }

    if "sqlite" not in url:
        kwargs["pool_size"] = settings.DB_POOL_SIZE
        kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW
        kwargs["pool_recycle"] = settings.DB_POOL_RECYCLE
        kwargs["pool_timeout"] = settings.DB_POOL_TIMEOUT

    return kwargs


db_url = normalize_database_url(settings.DATABASE_URL)
engine = create_async_engine(
    db_url,
    **get_engine_kwargs(db_url, is_dev=settings.is_development),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_connection() -> dict:
    """Performs a lightweight query to verify database connectivity without leaking credentials."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            return {
                "status": "connected",
                "dialect": engine.dialect.name if hasattr(engine, "dialect") else "unknown",
            }
    except Exception as exc:
        logger.warning("Database health check failed: %s", type(exc).__name__)
        return {
            "status": "disconnected",
            "dialect": engine.dialect.name if hasattr(engine, "dialect") else "unknown",
            "error": "Database query failed",
        }
