from datetime import date

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_diary_crud_and_privacy():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        alice = {"Authorization": "Bearer dev-alice"}
        bob = {"Authorization": "Bearer dev-bob"}

        today_str = date.today().isoformat()

        # 1. Alice writes a diary entry
        create_res = await client.post(
            "/api/v1/diary/entries",
            headers=alice,
            json={
                "entry_date": today_str,
                "title": "A Quiet Twilight Walk",
                "content": "Walked under the pine trees as the blue hour settled. Feeling peaceful and grateful.",
                "mood": "peaceful",
            },
        )
        assert create_res.status_code == 201
        entry_data = create_res.json()
        entry_id = entry_data["id"]
        assert entry_data["title"] == "A Quiet Twilight Walk"
        assert entry_data["mood"] == "peaceful"
        assert entry_data["entry_date"] == today_str

        # 2. Alice fetches entry by date
        date_res = await client.get(f"/api/v1/diary/entries/by-date/{today_str}", headers=alice)
        assert date_res.status_code == 200
        assert date_res.json()["id"] == entry_id

        # 3. Bob CANNOT access Alice's entry (strict privacy!)
        bob_date_res = await client.get(f"/api/v1/diary/entries/by-date/{today_str}", headers=bob)
        assert bob_date_res.status_code == 200
        assert bob_date_res.json() is None

        bob_id_res = await client.get(f"/api/v1/diary/entries/{entry_id}", headers=bob)
        assert bob_id_res.status_code == 404

        bob_patch_res = await client.patch(
            f"/api/v1/diary/entries/{entry_id}",
            headers=bob,
            json={"title": "Hacked Title"},
        )
        assert bob_patch_res.status_code == 404

        bob_del_res = await client.delete(f"/api/v1/diary/entries/{entry_id}", headers=bob)
        assert bob_del_res.status_code == 404

        bob_reflect = await client.post(f"/api/v1/diary/entries/{entry_id}/reflect", headers=bob)
        assert bob_reflect.status_code == 404

        # 4. Alice updates entry
        patch_res = await client.patch(
            f"/api/v1/diary/entries/{entry_id}",
            headers=alice,
            json={"mood": "reflective"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["mood"] == "reflective"

        # 5. Alice triggers explicit reflection
        reflect_res = await client.post(f"/api/v1/diary/entries/{entry_id}/reflect", headers=alice)
        assert reflect_res.status_code == 200
        ref_data = reflect_res.json()
        assert "reflection" in ref_data
        assert isinstance(ref_data["themes"], list)
        assert isinstance(ref_data["gentle_questions"], list)

        # 6. Alice deletes entry
        del_res = await client.delete(f"/api/v1/diary/entries/{entry_id}", headers=alice)
        assert del_res.status_code == 204
