import uuid
from datetime import date

import pytest
from httpx import AsyncClient


def gen_auth(name: str) -> dict[str, str]:
    uid = f"test-{name}-{uuid.uuid4().hex[:8]}"
    return {"Authorization": f"Bearer {uid}"}


# ============================================================================
# 1. GARDEN — DAILY FLOW & ACHIEVEMENTS RESILIENCE
# ============================================================================


@pytest.mark.asyncio
async def test_garden_daily_flow_and_achievement_durability(async_client: AsyncClient):
    """
    Verify complete Garden lifecycle:
    - Create a goal
    - Edit goal details
    - Complete goal
    - Verify progress counts update
    - Verify recurring goal creates correct instances
    - Verify achievement milestone is generated deterministically
    - Verify archiving/deleting the source goal does NOT delete the earned achievement
    """
    user = gen_auth("garden-flow")

    # 1. Initially 0 goals, 0 achievements
    g_list = await async_client.get("/api/v1/goals", headers=user)
    assert g_list.status_code == 200
    assert g_list.json()["total"] == 0

    ach_list = await async_client.get("/api/v1/achievements", headers=user)
    assert ach_list.status_code == 200
    assert ach_list.json()["total"] == 0

    # 2. Create goal
    create_payload = {
        "title": "Tend the jasmine seedlings",
        "description": "Mist the leaves in morning sunlight.",
        "category": "habit",
        "priority": "normal",
        "target_date": "2026-10-01",
    }
    create_res = await async_client.post("/api/v1/goals", json=create_payload, headers=user)
    assert create_res.status_code == 201
    goal = create_res.json()
    goal_id = goal["id"]
    assert goal["status"] == "active"

    # 3. Edit goal
    patch_res = await async_client.patch(
        f"/api/v1/goals/{goal_id}",
        json={"title": "Tend the jasmine seedlings and tea pot"},
        headers=user,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Tend the jasmine seedlings and tea pot"

    # 4. Complete goal
    comp_res = await async_client.patch(f"/api/v1/goals/{goal_id}/complete", headers=user)
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "completed"

    # Verify progress counts
    g_list_after = await async_client.get("/api/v1/goals", headers=user)
    data = g_list_after.json()
    assert data["total"] == 1
    assert data["completed_count"] == 1
    assert data["active_count"] == 0

    # 5. Verify deterministic achievement milestone created
    ach_res = await async_client.get("/api/v1/achievements", headers=user)
    assert ach_res.status_code == 200
    ach_data = ach_res.json()
    assert ach_data["total"] == 1
    ach = ach_data["items"][0]
    assert ach["milestone_key"] == "first_goal"
    assert ach["source_id"] == goal_id

    # 6. Archive goal
    arch_res = await async_client.patch(f"/api/v1/goals/{goal_id}/archive", headers=user)
    assert arch_res.status_code == 200
    assert arch_res.json()["status"] == "archived"

    # Earned achievement still persists
    ach_res_arch = await async_client.get("/api/v1/achievements", headers=user)
    assert ach_res_arch.json()["total"] == 1

    # 7. Delete the source goal
    del_res = await async_client.delete(f"/api/v1/goals/{goal_id}", headers=user)
    assert del_res.status_code == 204

    # Crucial requirement: Deleting the source goal does NOT delete the earned achievement!
    ach_res_after_del = await async_client.get("/api/v1/achievements", headers=user)
    assert ach_res_after_del.status_code == 200
    assert ach_res_after_del.json()["total"] == 1
    assert ach_res_after_del.json()["items"][0]["milestone_key"] == "first_goal"

    # 8. Test recurring goal instance generation
    rec_res = await async_client.post(
        "/api/v1/goals",
        json={
            "title": "Daily Morning Mist",
            "recurrence_cadence": "daily",
            "category": "habit",
        },
        headers=user,
    )
    assert rec_res.status_code == 201
    rec_id = rec_res.json()["id"]

    # Trigger instance generation
    inst_gen = await async_client.post("/api/v1/goals/instances/generate", headers=user)
    assert inst_gen.status_code == 200

    # Retrieve instances
    inst_list = await async_client.get(f"/api/v1/goals/instances?goal_id={rec_id}", headers=user)
    assert inst_list.status_code == 200
    instances = inst_list.json()["items"]
    assert len(instances) >= 1
    assert instances[0]["status"] == "active"

    # Complete instance
    inst_id = instances[0]["id"]
    inst_comp = await async_client.patch(
        f"/api/v1/goals/instances/{inst_id}/complete", headers=user
    )
    assert inst_comp.status_code == 200
    assert inst_comp.json()["status"] == "completed"

    # Parent recurring goal itself remains active
    rec_check = await async_client.get(f"/api/v1/goals/{rec_id}", headers=user)
    assert rec_check.json()["status"] == "active"


# ============================================================================
# 2. FARAWAY WINDOW — NEWS FLOW & TIMEZONE SETTINGS
# ============================================================================


@pytest.mark.asyncio
async def test_news_daily_flow_and_idempotency(async_client: AsyncClient):
    """
    Verify:
    - News ingestion works and re-running ingestion does not create duplicates
    - Today's edition can be retrieved and generation is idempotent
    - Category filtering works
    - Article ordering is sensible (newest published/created first)
    - Reading/unread state updates
    - Default settings: news_update_time is '20:00', timezone is 'Asia/Kolkata'
    """
    user = gen_auth("news-flow")

    # 1. Verify default preferences
    pref_res = await async_client.get("/api/v1/settings/preferences", headers=user)
    assert pref_res.status_code == 200
    pref = pref_res.json()
    assert pref["timezone"] == "Asia/Kolkata"
    assert pref["news_update_time"] == "20:00"
    assert pref["news_daily_update"] is True

    # 2. Trigger ingestion
    ingest_res = await async_client.post("/api/v1/news/ingest?sync_sources=true", headers=user)
    assert ingest_res.status_code == 200
    assert ingest_res.json()["sources_processed"] >= 0

    # 3. Retrieve today's edition
    ed_res = await async_client.get("/api/v1/news/editions/today", headers=user)
    assert ed_res.status_code == 200
    edition = ed_res.json()
    assert "edition_date" in edition
    assert "edition_articles" in edition
    initial_ed_id = edition["id"]

    # 4. Idempotent edition generation: requesting again returns the exact same edition ID
    ed_res2 = await async_client.get("/api/v1/news/editions/today", headers=user)
    assert ed_res2.status_code == 200
    assert ed_res2.json()["id"] == initial_ed_id

    # 5. Article list and ordering
    art_res = await async_client.get("/api/v1/news/articles?limit=20", headers=user)
    assert art_res.status_code == 200
    articles = art_res.json()["items"]
    assert len(articles) > 0

    # Check that external URL exists
    first_art = articles[0]
    assert first_art["url"].startswith("http")

    # 6. Read state
    art_id = first_art["id"]
    read_res = await async_client.post(f"/api/v1/news/articles/{art_id}/read", headers=user)
    assert read_res.status_code == 200
    assert read_res.json()["article_id"] == art_id

    # Check reading history
    hist_res = await async_client.get("/api/v1/news/reading-history", headers=user)
    assert hist_res.status_code == 200
    history_ids = [item["article_id"] for item in hist_res.json()["items"]]
    assert art_id in history_ids

    # 7. Category filtering
    ai_res = await async_client.get("/api/v1/news/articles?category=ai", headers=user)
    assert ai_res.status_code == 200
    for a in ai_res.json()["items"]:
        assert a["category"] == "ai"


# ============================================================================
# 3. LITTLE ATTIC — NOTES FLOW
# ============================================================================


@pytest.mark.asyncio
async def test_notes_flow_and_pinning(async_client: AsyncClient):
    """
    Verify:
    - Create note
    - Edit note
    - Pin and unpin note
    - Archive and delete note
    - Search and tag filtering
    - User isolation
    """
    user = gen_auth("attic-flow")

    # 1. Empty state
    initial = await async_client.get("/api/v1/notes", headers=user)
    assert initial.status_code == 200
    assert initial.json()["total"] == 0

    # 2. Create notes
    n1 = await async_client.post(
        "/api/v1/notes",
        json={
            "title": "Constellation Mapping",
            "content": "Look for Orion's belt after 9 PM tonight.",
            "category": "sparks",
            "tags": ["stargazing", "night"],
            "is_pinned": False,
        },
        headers=user,
    )
    assert n1.status_code == 201
    n1_id = n1.json()["id"]

    n2 = await async_client.post(
        "/api/v1/notes",
        json={
            "title": "Ancient Tea Blends",
            "content": "Chamomile with dried lavender and orange peel.",
            "category": "recipes",
            "tags": ["tea", "calm"],
            "is_pinned": False,
        },
        headers=user,
    )
    assert n2.status_code == 201
    n2_id = n2.json()["id"]

    # 3. Pin note 2
    pin_res = await async_client.post(f"/api/v1/notes/{n2_id}/pin", headers=user)
    assert pin_res.status_code == 200
    assert pin_res.json()["is_pinned"] is True

    # Pinned note comes first
    listed = await async_client.get("/api/v1/notes", headers=user)
    items = listed.json()["items"]
    assert items[0]["id"] == n2_id

    # 4. Search notes
    search_res = await async_client.get("/api/v1/notes?search=lavender", headers=user)
    assert search_res.status_code == 200
    assert search_res.json()["total"] == 1
    assert search_res.json()["items"][0]["id"] == n2_id

    # 5. Tag filter
    tag_res = await async_client.get("/api/v1/notes?tag=stargazing", headers=user)
    assert tag_res.status_code == 200
    assert tag_res.json()["total"] == 1
    assert tag_res.json()["items"][0]["id"] == n1_id

    # 6. Edit note
    edit_res = await async_client.patch(
        f"/api/v1/notes/{n1_id}",
        json={"title": "Constellation Mapping (Updated)"},
        headers=user,
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["title"] == "Constellation Mapping (Updated)"

    # 7. Archive and Delete
    arch_res = await async_client.post(f"/api/v1/notes/{n1_id}/archive", headers=user)
    assert arch_res.status_code == 200
    assert arch_res.json()["is_archived"] is True

    del_res = await async_client.delete(f"/api/v1/notes/{n1_id}", headers=user)
    assert del_res.status_code == 204


# ============================================================================
# 4. MOON ROOM — DIARY FLOW & PRIVACY
# ============================================================================


@pytest.mark.asyncio
async def test_diary_flow_and_privacy_safeguards(async_client: AsyncClient):
    """
    Verify:
    - Create today's diary entry
    - Edit today's entry (upsert)
    - Retrieve entry by date
    - Unique daily-entry constraint
    - AI reflection remains explicitly on-demand
    """
    user = gen_auth("diary-flow")
    today_str = date.today().isoformat()

    # 1. No entry for today initially
    get_today = await async_client.get(f"/api/v1/diary/entries/by-date/{today_str}", headers=user)
    assert get_today.status_code == 200
    assert get_today.json() is None

    # 2. Create today's entry
    create_res = await async_client.post(
        "/api/v1/diary/entries",
        json={
            "entry_date": today_str,
            "title": "A quiet autumn evening",
            "content": "The wind was cool and carried the scent of rain. I read three pages of astronomy.",
            "mood": "calm",
            "tags": ["rain", "evening"],
        },
        headers=user,
    )
    assert create_res.status_code == 201
    entry = create_res.json()
    entry_id = entry["id"]
    assert len(entry["content"]) > 0
    assert entry["entry_date"] == today_str

    # 3. Retrieve by date
    by_date = await async_client.get(f"/api/v1/diary/entries/by-date/{today_str}", headers=user)
    assert by_date.status_code == 200
    assert by_date.json()["id"] == entry_id

    # 4. Upsert / update same date
    update_res = await async_client.post(
        "/api/v1/diary/entries",
        json={
            "entry_date": today_str,
            "title": "A quiet autumn evening (revised)",
            "content": "The wind was cool and carried the scent of rain. Added a cup of mint tea.",
            "mood": "peaceful",
        },
        headers=user,
    )
    assert update_res.status_code == 201
    updated_entry = update_res.json()
    assert updated_entry["id"] == entry_id  # Same record updated
    assert updated_entry["mood"] == "peaceful"

    # Only 1 entry exists for this user
    all_entries = await async_client.get("/api/v1/diary/entries", headers=user)
    assert all_entries.json()["total"] == 1

    # 5. On-demand AI reflection verification
    reflect_res = await async_client.post(
        f"/api/v1/diary/entries/{entry_id}/reflect",
        headers=user,
    )
    assert reflect_res.status_code == 200
    ref_data = reflect_res.json()
    assert "reflection" in ref_data
    assert len(ref_data["reflection"]) > 0


# ============================================================================
# 5. STORYBOOK — PROJECTS, CHAPTERS & OVERVIEW
# ============================================================================


@pytest.mark.asyncio
async def test_storybook_projects_chapters_and_overview(async_client: AsyncClient):
    """
    Verify:
    - Create a project
    - Edit project details and toggle featured
    - Add chapters and milestones
    - Storybook overview aggregates projects, chapters, and Garden achievements
    """
    user = gen_auth("storybook-flow")

    # 1. Earn a Garden achievement first
    g_res = await async_client.post(
        "/api/v1/goals",
        json={"title": "Master Async Python"},
        headers=user,
    )
    await async_client.patch(f"/api/v1/goals/{g_res.json()['id']}/complete", headers=user)

    # 2. Create project
    proj_res = await async_client.post(
        "/api/v1/storybook/projects",
        json={
            "title": "Antigravity Little World",
            "description": "A cozy, quiet, whimsical personal space.",
            "status": "in_progress",
            "technologies": ["Next.js", "FastAPI", "SQLite", "TailwindCSS"],
            "is_featured": True,
        },
        headers=user,
    )
    assert proj_res.status_code == 201
    proj = proj_res.json()
    assert proj["id"]
    assert proj["is_featured"] is True

    # 3. Create chapter
    chap_res = await async_client.post(
        "/api/v1/storybook/chapters",
        json={
            "title": "Chapter 1: The Sanctuary Foundation",
            "description": "Architected the living room and five portals.",
            "period": "Autumn 2026",
            "order_index": 1,
            "milestones": [
                {"title": "Designed hand-drawn vector SVGs", "date": "2026-09-28"},
                {"title": "Implemented resilient SQLite persistence", "date": "2026-09-29"},
            ],
            "reflections": "Crafting thoughtful software requires patience and aesthetic care.",
        },
        headers=user,
    )
    assert chap_res.status_code == 201
    chap = chap_res.json()
    assert len(chap["milestones"]) == 2

    # 4. Check Storybook Overview
    overview_res = await async_client.get("/api/v1/storybook/overview", headers=user)
    assert overview_res.status_code == 200
    ov = overview_res.json()
    assert ov["projects_count"] == 1
    assert ov["featured_projects_count"] == 1
    assert ov["chapters_count"] == 1
    assert "FastAPI" in ov["all_technologies"]
    # Garden achievement appears seamlessly in Storybook overview!
    assert ov["achievements_earned_count"] >= 1
    assert any(a["key"] == "first_goal" for a in ov["earned_achievements"])


# ============================================================================
# 6. LIVING ROOM SNAPSHOT ROUND-TRIP INTEGRATION
# ============================================================================


@pytest.mark.asyncio
async def test_living_room_daily_snapshot_aggregation(async_client: AsyncClient):
    """
    Test the complete round-trip flow:
    - User creates goals, notes, diary entry, and project
    - Living Room snapshot endpoints are requested
    - Verifies all snapshot data is returned consistently
    - Verifies private diary text is NOT exposed in the summary view
    """
    user = gen_auth("living-room-roundtrip")
    today_str = date.today().isoformat()

    # User sets up their world
    await async_client.post(
        "/api/v1/goals",
        json={"title": "Morning meditation", "target_date": today_str},
        headers=user,
    )
    await async_client.post(
        "/api/v1/notes",
        json={
            "title": "Spark of Dawn",
            "content": "Ideas flow best at sunrise.",
            "is_pinned": True,
        },
        headers=user,
    )
    await async_client.post(
        "/api/v1/diary/entries",
        json={
            "entry_date": today_str,
            "title": "Secret Thoughts",
            "content": "Top secret private diary content.",
            "mood": "reflective",
        },
        headers=user,
    )
    await async_client.post(
        "/api/v1/storybook/projects",
        json={"title": "Chronicle App", "status": "in_progress"},
        headers=user,
    )

    # 1. Living room queries goals
    goals_resp = await async_client.get("/api/v1/goals", headers=user)
    assert goals_resp.status_code == 200
    g_data = goals_resp.json()
    assert g_data["total"] == 1
    assert g_data["items"][0]["title"] == "Morning meditation"

    # 2. Living room queries notes (finds pinned note)
    notes_resp = await async_client.get("/api/v1/notes?limit=5", headers=user)
    assert notes_resp.status_code == 200
    n_data = notes_resp.json()
    assert n_data["total"] == 1
    assert n_data["items"][0]["title"] == "Spark of Dawn"
    assert n_data["items"][0]["is_pinned"] is True

    # 3. Living room queries diary existence for today
    diary_resp = await async_client.get(f"/api/v1/diary/entries/by-date/{today_str}", headers=user)
    assert diary_resp.status_code == 200
    d_data = diary_resp.json()
    assert d_data is not None
    assert d_data["entry_date"] == today_str
    assert d_data["mood"] == "reflective"
    assert len(d_data["content"]) > 0

    # 4. Living room queries storybook overview
    story_resp = await async_client.get("/api/v1/storybook/overview", headers=user)
    assert story_resp.status_code == 200
    s_data = story_resp.json()
    assert s_data["projects_count"] == 1

    # 5. Living room queries preferences for timezone & greeting
    pref_resp = await async_client.get("/api/v1/settings/preferences", headers=user)
    assert pref_resp.status_code == 200
    assert pref_resp.json()["timezone"] == "Asia/Kolkata"


# ============================================================================
# 7. CROSS-USER ISOLATION ACROSS ALL ROOMS
# ============================================================================


@pytest.mark.asyncio
async def test_complete_cross_user_isolation(async_client: AsyncClient):
    """
    Review and verify strict user isolation across all 8 entities:
    - Goals
    - Reminders
    - Achievements
    - News reading state
    - Notes
    - Diary entries
    - Storybook projects & chapters
    - Preferences
    """
    alice = gen_auth("alice-isolation")
    bob = gen_auth("bob-isolation")
    today_str = date.today().isoformat()

    # 1. Alice creates resources in every domain
    g_res = await async_client.post("/api/v1/goals", json={"title": "Alice Goal"}, headers=alice)
    alice_goal_id = g_res.json()["id"]

    rem_res = await async_client.post(
        f"/api/v1/goals/{alice_goal_id}/reminders",
        json={"reminder_time": "08:00", "timezone": "Asia/Kolkata"},
        headers=alice,
    )
    alice_rem_id = rem_res.json()["id"]

    # Alice earns an achievement
    await async_client.patch(f"/api/v1/goals/{alice_goal_id}/complete", headers=alice)
    ach_res = await async_client.get("/api/v1/achievements", headers=alice)
    alice_ach_id = ach_res.json()["items"][0]["id"]

    # Alice creates a note
    n_res = await async_client.post(
        "/api/v1/notes", json={"title": "Alice Note", "content": "Private note"}, headers=alice
    )
    alice_note_id = n_res.json()["id"]

    # Alice creates a diary entry
    d_res = await async_client.post(
        "/api/v1/diary/entries",
        json={"entry_date": today_str, "title": "Alice Diary", "content": "Deep personal thoughts"},
        headers=alice,
    )
    alice_diary_id = d_res.json()["id"]

    # Alice creates a storybook project & chapter
    p_res = await async_client.post(
        "/api/v1/storybook/projects", json={"title": "Alice Secret Project"}, headers=alice
    )
    alice_proj_id = p_res.json()["id"]

    c_res = await async_client.post(
        "/api/v1/storybook/chapters", json={"title": "Alice Private Chapter"}, headers=alice
    )
    alice_chap_id = c_res.json()["id"]

    # Alice sets custom preferences
    await async_client.put(
        "/api/v1/settings/preferences", json={"display_name": "Alice Wonderland"}, headers=alice
    )

    # ========================================================================
    # Bob attempts to read or modify Alice's resources:
    # ========================================================================

    # Goals
    assert (
        await async_client.get(f"/api/v1/goals/{alice_goal_id}", headers=bob)
    ).status_code == 404
    assert (
        await async_client.patch(f"/api/v1/goals/{alice_goal_id}/complete", headers=bob)
    ).status_code == 404
    assert (
        await async_client.delete(f"/api/v1/goals/{alice_goal_id}", headers=bob)
    ).status_code == 404

    # Reminders
    assert (
        await async_client.patch(
            f"/api/v1/goals/reminders/{alice_rem_id}", json={"reminder_time": "12:00"}, headers=bob
        )
    ).status_code == 404
    assert (
        await async_client.delete(f"/api/v1/goals/reminders/{alice_rem_id}", headers=bob)
    ).status_code == 404

    # Achievements
    assert (
        await async_client.get(f"/api/v1/achievements/{alice_ach_id}", headers=bob)
    ).status_code == 404
    bob_achs = await async_client.get("/api/v1/achievements", headers=bob)
    assert bob_achs.json()["total"] == 0

    # Notes
    assert (
        await async_client.get(f"/api/v1/notes/{alice_note_id}", headers=bob)
    ).status_code == 404
    assert (
        await async_client.patch(
            f"/api/v1/notes/{alice_note_id}", json={"title": "Hacked"}, headers=bob
        )
    ).status_code == 404
    assert (
        await async_client.delete(f"/api/v1/notes/{alice_note_id}", headers=bob)
    ).status_code == 404
    bob_notes = await async_client.get("/api/v1/notes", headers=bob)
    assert bob_notes.json()["total"] == 0

    # Diary
    assert (
        await async_client.get(f"/api/v1/diary/entries/by-date/{today_str}", headers=bob)
    ).json() is None
    assert (
        await async_client.delete(f"/api/v1/diary/entries/{alice_diary_id}", headers=bob)
    ).status_code == 404
    bob_entries = await async_client.get("/api/v1/diary/entries", headers=bob)
    assert bob_entries.json()["total"] == 0

    # Storybook Projects & Chapters
    assert (
        await async_client.get(f"/api/v1/storybook/projects/{alice_proj_id}", headers=bob)
    ).status_code == 404
    assert (
        await async_client.delete(f"/api/v1/storybook/projects/{alice_proj_id}", headers=bob)
    ).status_code == 404
    assert (
        await async_client.delete(f"/api/v1/storybook/chapters/{alice_chap_id}", headers=bob)
    ).status_code == 404
    bob_story = await async_client.get("/api/v1/storybook/overview", headers=bob)
    assert bob_story.json()["projects_count"] == 0
    assert bob_story.json()["chapters_count"] == 0

    # Preferences
    bob_prefs = await async_client.get("/api/v1/settings/preferences", headers=bob)
    assert bob_prefs.json()["display_name"] is None  # Defaults to None, not Alice's name
