import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import engine
from app.main import app


@pytest.fixture(autouse=True)
async def cleanup_db_connections():
    yield
    await engine.dispose()


@pytest.fixture
async def async_client():
    """Provides an async HTTP client for testing FastAPI routes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
