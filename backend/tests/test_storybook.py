import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

AUTH_HEADERS_ALICE = {"Authorization": "Bearer dev-alice"}
AUTH_HEADERS_BOB = {"Authorization": "Bearer dev-bob"}


@pytest.mark.asyncio
async def test_storybook_projects_and_isolation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Alice creates a project
        resp = await client.post(
            "/api/v1/storybook/projects",
            headers=AUTH_HEADERS_ALICE,
            json={
                "title": "Your Little World",
                "description": "A cozy digital world for one person.",
                "status": "completed",
                "technologies": ["Next.js", "FastAPI", "Tailwind", "SQLite"],
                "github_url": "https://github.com/example/your-little-world",
                "live_url": "https://littleworld.example.com",
                "is_featured": True,
                "lessons_learned": "Keeping things quiet and simple is harder than adding complexity.",
            },
        )
        assert resp.status_code == 201
        p_data = resp.json()
        project_id = p_data["id"]
        assert p_data["title"] == "Your Little World"
        assert p_data["status"] == "completed"
        assert p_data["is_featured"] is True
        assert "FastAPI" in p_data["technologies"]

        # 2. Alice lists her projects
        resp = await client.get("/api/v1/storybook/projects", headers=AUTH_HEADERS_ALICE)
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert any(p["id"] == project_id for p in items)

        # 3. Bob cannot see Alice's project
        resp_bob = await client.get("/api/v1/storybook/projects", headers=AUTH_HEADERS_BOB)
        assert resp_bob.status_code == 200
        bob_items = resp_bob.json()["items"]
        assert all(p["id"] != project_id for p in bob_items)

        # 4. Bob cannot get or delete Alice's project
        resp_bob_get = await client.get(
            f"/api/v1/storybook/projects/{project_id}", headers=AUTH_HEADERS_BOB
        )
        assert resp_bob_get.status_code == 404

        resp_bob_del = await client.delete(
            f"/api/v1/storybook/projects/{project_id}", headers=AUTH_HEADERS_BOB
        )
        assert resp_bob_del.status_code == 404

        # 5. Alice toggles featured
        resp_toggle = await client.post(
            f"/api/v1/storybook/projects/{project_id}/featured", headers=AUTH_HEADERS_ALICE
        )
        assert resp_toggle.status_code == 200
        assert resp_toggle.json()["is_featured"] is False

        # 6. Alice creates a chapter
        resp_ch = await client.post(
            "/api/v1/storybook/chapters",
            headers=AUTH_HEADERS_ALICE,
            json={
                "title": "The Awakening",
                "description": "Beginning the journey of crafting digital sanctuaries.",
                "period": "Autumn 2026",
                "order_index": 1,
                "milestones": [{"title": "Phase 1 Complete", "date": "2026-09-27"}],
                "reflections": "Learning to build spaces that feel calm.",
            },
        )
        assert resp_ch.status_code == 201
        ch_id = resp_ch.json()["id"]

        # 7. Bob cannot get Alice's chapter
        resp_bob_ch = await client.get(
            f"/api/v1/storybook/chapters/{ch_id}", headers=AUTH_HEADERS_BOB
        )
        assert resp_bob_ch.status_code == 404

        # 8. Alice updates her chapter (editing requirement)
        resp_update = await client.put(
            f"/api/v1/storybook/chapters/{ch_id}",
            headers=AUTH_HEADERS_ALICE,
            json={
                "title": "The Awakening (Refined)",
                "description": "Updated narrative of digital sanctuaries.",
                "period": "Autumn 2026 - Winter 2026",
                "reflections": "Patience and craft deepen over time.",
                "milestones": [
                    {"title": "Phase 1 Complete", "date": "2026-09-27"},
                    {"title": "Phase 2 Complete", "date": "2026-10-02"},
                ],
            },
        )
        assert resp_update.status_code == 200
        updated_data = resp_update.json()
        assert updated_data["id"] == ch_id
        assert updated_data["title"] == "The Awakening (Refined)"
        assert updated_data["period"] == "Autumn 2026 - Winter 2026"
        assert len(updated_data["milestones"]) == 2

        # 9. Verify Alice's chapter list does NOT duplicate the chapter
        resp_list_ch = await client.get("/api/v1/storybook/chapters", headers=AUTH_HEADERS_ALICE)
        assert resp_list_ch.status_code == 200
        alice_chapters = resp_list_ch.json()["items"]
        matching = [c for c in alice_chapters if c["id"] == ch_id]
        assert len(matching) == 1
        assert matching[0]["title"] == "The Awakening (Refined)"

        # 10. Check Overview endpoint
        resp_overview = await client.get("/api/v1/storybook/overview", headers=AUTH_HEADERS_ALICE)
        assert resp_overview.status_code == 200
        ov = resp_overview.json()
        assert ov["projects_count"] >= 1
        assert ov["completed_projects_count"] >= 1
        assert "FastAPI" in ov["all_technologies"]
        assert ov["chapters_count"] >= 1

        # Clean up
        del_p = await client.delete(
            f"/api/v1/storybook/projects/{project_id}", headers=AUTH_HEADERS_ALICE
        )
        assert del_p.status_code == 204
        del_ch = await client.delete(
            f"/api/v1/storybook/chapters/{ch_id}", headers=AUTH_HEADERS_ALICE
        )
        assert del_ch.status_code == 204
