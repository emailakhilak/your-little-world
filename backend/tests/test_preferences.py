import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_user_preferences_isolation_and_defaults():
    alice_id = f"dev-alice-pref-{uuid.uuid4().hex[:8]}"
    bob_id = f"dev-bob-pref-{uuid.uuid4().hex[:8]}"
    auth_headers_alice = {"Authorization": f"Bearer {alice_id}"}
    auth_headers_bob = {"Authorization": f"Bearer {bob_id}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Alice fetches default preferences
        resp = await client.get("/api/v1/settings/preferences", headers=auth_headers_alice)
        assert resp.status_code == 200
        data = resp.json()
        assert data["timezone"] == "Asia/Kolkata"
        assert data["news_daily_update"] is True
        assert data["news_update_time"] == "20:00"
        assert data["reduced_motion"] is False

        # 2. Alice updates her preferences
        resp_update = await client.put(
            "/api/v1/settings/preferences",
            headers=auth_headers_alice,
            json={
                "display_name": "Alice Wonder",
                "timezone": "Europe/London",
                "reduced_motion": True,
                "news_update_time": "19:30",
            },
        )
        assert resp_update.status_code == 200
        updated = resp_update.json()
        assert updated["display_name"] == "Alice Wonder"
        assert updated["timezone"] == "Europe/London"
        assert updated["reduced_motion"] is True
        assert updated["news_update_time"] == "19:30"

        # 3. Bob fetches his preferences and sees defaults (isolation)
        resp_bob = await client.get("/api/v1/settings/preferences", headers=auth_headers_bob)
        assert resp_bob.status_code == 200
        bob_data = resp_bob.json()
        assert bob_data["user_id"] != updated["user_id"]
        assert bob_data["timezone"] == "Asia/Kolkata"
        assert bob_data["reduced_motion"] is False
        assert bob_data["display_name"] is None
