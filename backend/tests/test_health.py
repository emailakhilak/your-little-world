import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    """Verifies that the root endpoint responds with a welcome message and links."""
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Your Little World" in data["message"]
    assert data["api_v1"] == "/api/v1"


@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient):
    """Verifies that the health check endpoint returns 200 and database connectivity status."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "database" in data
    assert "status" in data["database"]
    assert data["version"] == "0.1.0"
