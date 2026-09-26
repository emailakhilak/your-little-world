import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_me_without_token_returns_401(async_client: AsyncClient):
    """Verifies that accessing protected /api/v1/auth/me without a Bearer token returns 401."""
    response = await async_client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Missing Authorization Bearer token" in response.json()["detail"]
