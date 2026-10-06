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


@pytest.mark.asyncio
async def test_today_entry_time_repeated_saves_and_immutability():
    import uuid
    from datetime import timedelta

    from app.core.timezone import get_today_date

    uid = f"dev-moon-user-{uuid.uuid4().hex[:6]}"
    int_uid = f"dev-moon-intruder-{uuid.uuid4().hex[:6]}"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = {"Authorization": f"Bearer {uid}"}
        intruder = {"Authorization": f"Bearer {int_uid}"}

        # Determine today according to user default timezone (Asia/Kolkata)
        today = get_today_date("Asia/Kolkata")
        today_str = today.isoformat()
        yesterday_str = (today - timedelta(days=1)).isoformat()

        # 1. Today's entry can be created with user-controlled time
        res1 = await client.post(
            "/api/v1/diary/entries",
            headers=user,
            json={
                "entry_date": today_str,
                "content": "First draft of tonight's thoughts.",
                "entry_time": "10:30 PM",
            },
        )
        assert res1.status_code == 201
        data1 = res1.json()
        assert data1["content"] == "First draft of tonight's thoughts."
        assert data1["entry_time"] == "10:30 PM"
        entry_id = data1["id"]

        # 2. Today's entry can be edited / saved repeatedly via POST (upsert)
        res2 = await client.post(
            "/api/v1/diary/entries",
            headers=user,
            json={
                "entry_date": today_str,
                "content": "Second revision with deeper thoughts under the moon.",
                "entry_time": "11:15 PM",
            },
        )
        assert res2.status_code == 201
        data2 = res2.json()
        assert data2["id"] == entry_id
        assert data2["content"] == "Second revision with deeper thoughts under the moon."
        assert data2["entry_time"] == "11:15 PM"

        # 3. Today's entry can be edited via PATCH
        res3 = await client.patch(
            f"/api/v1/diary/entries/{entry_id}",
            headers=user,
            json={
                "content": "Final evening thought.",
                "entry_time": "11:45 PM",
            },
        )
        assert res3.status_code == 200
        data3 = res3.json()
        assert data3["content"] == "Final evening thought."
        assert data3["entry_time"] == "11:45 PM"

        # 4. Fetch entry by date verifies user-controlled time is stored and returned
        fetch_res = await client.get(f"/api/v1/diary/entries/by-date/{today_str}", headers=user)
        assert fetch_res.status_code == 200
        assert fetch_res.json()["entry_time"] == "11:45 PM"

        # 5. User isolation: Intruder cannot see user's entry
        intruder_fetch = await client.get(
            f"/api/v1/diary/entries/by-date/{today_str}", headers=intruder
        )
        assert intruder_fetch.status_code == 200
        assert intruder_fetch.json() is None

        # 6. PAST ENTRIES ARE IMMUTABLE:
        # Attempting to create or modify a past entry must be rejected by the backend (403 Forbidden)
        past_create = await client.post(
            "/api/v1/diary/entries",
            headers=user,
            json={
                "entry_date": yesterday_str,
                "content": "Trying to backdate an entry.",
                "entry_time": "09:00 PM",
            },
        )
        assert past_create.status_code == 403
        assert "immutable" in past_create.json()["detail"].lower()


@pytest.mark.asyncio
async def test_past_entry_modification_rejection_with_user_timezone():
    import uuid
    from datetime import timedelta

    from app.core.database import AsyncSessionLocal
    from app.core.timezone import now_in_timezone
    from app.models.diary import DiaryEntry

    uid = f"dev-london-user-{uuid.uuid4().hex[:6]}"
    # Set user preference to London
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = {"Authorization": f"Bearer {uid}"}
        await client.put(
            "/api/v1/settings/preferences",
            headers=user,
            json={"timezone": "Europe/London"},
        )

        london_today = now_in_timezone("Europe/London").date()
        past_date = london_today - timedelta(days=5)

        # Directly insert an older entry into the database (simulating a legitimate past entry)
        async with AsyncSessionLocal() as session:
            old_entry = DiaryEntry(
                user_id=uid,
                entry_date=past_date,
                content="Historical memories written in the past.",
                reflection_json={"entry_time": "08:15 PM"},
            )
            session.add(old_entry)
            await session.commit()
            await session.refresh(old_entry)
            past_entry_id = old_entry.id

        # 1. Past entry CAN be fetched and viewed (Read-only)
        view_res = await client.get(
            f"/api/v1/diary/entries/by-date/{past_date.isoformat()}", headers=user
        )
        assert view_res.status_code == 200
        past_data = view_res.json()
        assert past_data["content"] == "Historical memories written in the past."
        assert past_data["entry_time"] == "08:15 PM"

        # 2. Past entry CANNOT be modified via PATCH (403 Forbidden)
        patch_res = await client.patch(
            f"/api/v1/diary/entries/{past_entry_id}",
            headers=user,
            json={"content": "Attempting to change history"},
        )
        assert patch_res.status_code == 403
        assert "immutable" in patch_res.json()["detail"].lower()

        # 3. Past entry CANNOT be overwritten via POST (403 Forbidden)
        overwrite_res = await client.post(
            "/api/v1/diary/entries",
            headers=user,
            json={
                "entry_date": past_date.isoformat(),
                "content": "Attempting to overwrite history",
            },
        )
        assert overwrite_res.status_code == 403

        # 4. Past entry CANNOT be deleted (403 Forbidden)
        del_res = await client.delete(
            f"/api/v1/diary/entries/{past_entry_id}",
            headers=user,
        )
        assert del_res.status_code == 403


@pytest.mark.asyncio
async def test_missing_date_returns_none_for_empty_state():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = {"Authorization": "Bearer dev-moon-empty-user"}
        # A date where no entry was ever written
        res = await client.get("/api/v1/diary/entries/by-date/2020-01-01", headers=user)
        assert res.status_code == 200
        assert res.json() is None


