import uuid
from datetime import date, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_ledger_crud_and_privacy():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_uid = uuid.uuid4().hex[:8]
        alice = {"Authorization": f"Bearer test-ledger-alice-{test_uid}"}
        bob = {"Authorization": f"Bearer test-ledger-bob-{test_uid}"}

        today = date.today()
        today_str = today.isoformat()
        yesterday_str = (today - timedelta(days=1)).isoformat()

        # 1. Unauthenticated request rejected
        unauth_res = await client.get("/api/v1/ledger/entries")
        assert unauth_res.status_code in (401, 403)

        # 2. Query empty date returns None / null
        empty_date_res = await client.get(
            f"/api/v1/ledger/entries/by-date/{today_str}",
            headers=alice,
        )
        assert empty_date_res.status_code == 200
        assert empty_date_res.json() is None

        # 3. Alice creates a money diary entry
        create_res = await client.post(
            "/api/v1/ledger/entries",
            headers=alice,
            json={
                "entry_date": today_str,
                "content": "Spent ₹250 for lunch today.\n₹80 for travel.\nBought a notebook because I liked it.",
            },
        )
        assert create_res.status_code == 201
        entry_data = create_res.json()
        entry_id = entry_data["id"]
        assert entry_data["entry_date"] == today_str
        assert "₹250 for lunch" in entry_data["content"]
        assert entry_data["created_at"] is not None
        assert entry_data["updated_at"] is not None

        # 4. Alice retrieves the entry by ID
        get_res = await client.get(f"/api/v1/ledger/entries/{entry_id}", headers=alice)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == entry_id

        # 5. Alice retrieves the entry by calendar date
        by_date_res = await client.get(
            f"/api/v1/ledger/entries/by-date/{today_str}",
            headers=alice,
        )
        assert by_date_res.status_code == 200
        assert by_date_res.json()["id"] == entry_id

        # 6. Alice creates an entry for yesterday
        create_prev_res = await client.post(
            "/api/v1/ledger/entries",
            headers=alice,
            json={
                "entry_date": yesterday_str,
                "content": "Got ₹2,000 from freelance work.\nHad dinner with family.",
            },
        )
        assert create_prev_res.status_code == 201

        # 7. Alice lists recent entries (recent first)
        list_res = await client.get("/api/v1/ledger/entries?limit=10", headers=alice)
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert list_data["total"] >= 2
        # Verify ordering: today comes before yesterday
        items = list_data["items"]
        assert items[0]["entry_date"] == today_str
        assert items[1]["entry_date"] == yesterday_str

        # 8. User Data Isolation: Bob cannot access Alice's entries
        bob_date_res = await client.get(
            f"/api/v1/ledger/entries/by-date/{today_str}",
            headers=bob,
        )
        assert bob_date_res.status_code == 200
        assert bob_date_res.json() is None

        bob_id_res = await client.get(f"/api/v1/ledger/entries/{entry_id}", headers=bob)
        assert bob_id_res.status_code == 404

        bob_update_res = await client.put(
            f"/api/v1/ledger/entries/{entry_id}",
            headers=bob,
            json={"content": "Malicious overwrite"},
        )
        assert bob_update_res.status_code == 404

        bob_delete_res = await client.delete(
            f"/api/v1/ledger/entries/{entry_id}",
            headers=bob,
        )
        assert bob_delete_res.status_code == 404

        # Bob's list is empty
        bob_list_res = await client.get("/api/v1/ledger/entries", headers=bob)
        assert bob_list_res.status_code == 200
        assert bob_list_res.json()["total"] == 0

        # 9. Alice edits her entry
        update_res = await client.put(
            f"/api/v1/ledger/entries/{entry_id}",
            headers=alice,
            json={"content": "Spent ₹250 for lunch.\n₹80 for travel.\nBought a nice notebook for ₹150."},
        )
        assert update_res.status_code == 200
        assert "Bought a nice notebook for ₹150" in update_res.json()["content"]
        assert update_res.json()["entry_date"] == today_str

        # 10. Alice deletes her entry
        delete_res = await client.delete(f"/api/v1/ledger/entries/{entry_id}", headers=alice)
        assert delete_res.status_code == 204

        # Verify it's gone
        deleted_check = await client.get(f"/api/v1/ledger/entries/{entry_id}", headers=alice)
        assert deleted_check.status_code == 404
