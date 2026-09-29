import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_notes_crud_and_user_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        alice = {"Authorization": "Bearer dev-alice"}
        bob = {"Authorization": "Bearer dev-bob"}

        # 1. Alice creates a note
        create_res = await client.post(
            "/api/v1/notes",
            headers=alice,
            json={
                "title": "Quantum Telemetry Architecture",
                "content": "A lightweight distributed protocol for low-bandwidth lunar landers.",
                "tags": ["space", "systems"],
                "category": "project",
                "is_pinned": True,
            },
        )
        assert create_res.status_code == 201
        note_data = create_res.json()
        note_id = note_data["id"]
        assert note_data["title"] == "Quantum Telemetry Architecture"
        assert note_data["is_pinned"] is True
        assert note_data["tags"] == ["space", "systems"]

        # 2. Alice retrieves note
        get_res = await client.get(f"/api/v1/notes/{note_id}", headers=alice)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == note_id

        # 3. Bob CANNOT access Alice's note (strict isolation)
        bob_get = await client.get(f"/api/v1/notes/{note_id}", headers=bob)
        assert bob_get.status_code == 404

        bob_patch = await client.patch(
            f"/api/v1/notes/{note_id}",
            headers=bob,
            json={"title": "Hacked"},
        )
        assert bob_patch.status_code == 404

        bob_del = await client.delete(f"/api/v1/notes/{note_id}", headers=bob)
        assert bob_del.status_code == 404

        # 4. Alice updates note
        update_res = await client.patch(
            f"/api/v1/notes/{note_id}",
            headers=alice,
            json={"title": "Quantum Telemetry Protocol v2", "is_pinned": False},
        )
        assert update_res.status_code == 200
        assert update_res.json()["title"] == "Quantum Telemetry Protocol v2"
        assert update_res.json()["is_pinned"] is False

        # 5. Alice toggles archive
        arch_res = await client.post(f"/api/v1/notes/{note_id}/archive", headers=alice)
        assert arch_res.status_code == 200
        assert arch_res.json()["is_archived"] is True

        # In active notes list, it should not appear
        active_list = await client.get("/api/v1/notes?is_archived=false", headers=alice)
        assert active_list.status_code == 200
        assert not any(n["id"] == note_id for n in active_list.json()["items"])

        # In archived notes list, it appears
        arch_list = await client.get("/api/v1/notes?is_archived=true", headers=alice)
        assert arch_list.status_code == 200
        assert any(n["id"] == note_id for n in arch_list.json()["items"])

        # Unarchive
        unarch_res = await client.post(f"/api/v1/notes/{note_id}/archive", headers=alice)
        assert unarch_res.status_code == 200
        assert unarch_res.json()["is_archived"] is False

        # 6. Search notes
        search_res = await client.get("/api/v1/notes?search=lunar", headers=alice)
        assert search_res.status_code == 200
        assert len(search_res.json()["items"]) >= 1

        search_empty = await client.get("/api/v1/notes?search=nonexistenttermxyz", headers=alice)
        assert search_empty.status_code == 200
        assert len(search_empty.json()["items"]) == 0

        # 7. AI Tag Suggestion
        sug_res = await client.post(
            "/api/v1/notes/suggest-tags",
            headers=alice,
            json={"title": "Build a React parser", "content": "Need to parse AST nodes in TS"},
        )
        assert sug_res.status_code == 200
        assert "suggested_category" in sug_res.json()
        assert "suggested_tags" in sug_res.json()

        # 8. Delete note
        del_res = await client.delete(f"/api/v1/notes/{note_id}", headers=alice)
        assert del_res.status_code == 204
