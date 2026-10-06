import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_goal_unauthorized(async_client: AsyncClient):
    """POST /api/v1/goals without token returns 401."""
    response = await async_client.post(
        "/api/v1/goals",
        json={"title": "Plant a midnight willow"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_and_get_goal(async_client: AsyncClient):
    """POST /api/v1/goals creates a goal for authenticated user."""
    headers = {"Authorization": "Bearer test-user-gardener"}
    payload = {
        "title": "Water the tea sapling",
        "description": "Brew peppermint tea after watering the balcony pots.",
        "category": "habit",
        "icon": "🌱",
        "priority": "normal",
        "recurrence_cadence": "daily",
    }
    response = await async_client.post("/api/v1/goals", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Water the tea sapling"
    assert data["description"] == "Brew peppermint tea after watering the balcony pots."
    assert data["category"] == "habit"
    assert data["icon"] == "🌱"
    assert data["status"] == "active"
    assert data["user_id"] == "test-user-gardener"
    assert data["recurrence_cadence"] == "daily"
    assert data["progress_current"] == 0
    assert data["progress_target"] == 1
    goal_id = data["id"]

    # Retrieve single goal
    get_res = await async_client.get(f"/api/v1/goals/{goal_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == goal_id


@pytest.mark.asyncio
async def test_user_isolation(async_client: AsyncClient):
    """Ensure User A cannot view or manipulate User B's goals."""
    user_a_headers = {"Authorization": "Bearer test-user-alice"}
    user_b_headers = {"Authorization": "Bearer test-user-bob"}

    # Alice creates a secret seed
    res = await async_client.post(
        "/api/v1/goals",
        json={"title": "Alice's secret jasmine flower", "category": "milestone"},
        headers=user_a_headers,
    )
    assert res.status_code == 201
    goal_id = res.json()["id"]

    # Bob lists his goals: Alice's goal must NOT appear
    bob_list = await async_client.get("/api/v1/goals", headers=user_b_headers)
    assert bob_list.status_code == 200
    bob_items = bob_list.json()["items"]
    assert not any(item["id"] == goal_id for item in bob_items)

    # Bob directly requests Alice's goal ID: must return 404
    bob_direct = await async_client.get(f"/api/v1/goals/{goal_id}", headers=user_b_headers)
    assert bob_direct.status_code == 404

    # Bob tries to update Alice's goal: must return 404
    bob_update = await async_client.patch(
        f"/api/v1/goals/{goal_id}",
        json={"title": "Bob's hijack attempt"},
        headers=user_b_headers,
    )
    assert bob_update.status_code == 404

    # Bob tries to delete Alice's goal: must return 404
    bob_delete = await async_client.delete(f"/api/v1/goals/{goal_id}", headers=user_b_headers)
    assert bob_delete.status_code == 404


@pytest.mark.asyncio
async def test_toggle_complete_and_archive(async_client: AsyncClient):
    """Test completing, uncompleting, and archiving a goal."""
    headers = {"Authorization": "Bearer test-user-charlie"}

    # Create goal
    create_res = await async_client.post(
        "/api/v1/goals",
        json={"title": "Morning meditation in the greenhouse", "category": "seedling"},
        headers=headers,
    )
    assert create_res.status_code == 201
    goal_id = create_res.json()["id"]

    # Toggle complete
    complete_res = await async_client.patch(f"/api/v1/goals/{goal_id}/complete", headers=headers)
    assert complete_res.status_code == 200
    comp_data = complete_res.json()
    assert comp_data["status"] == "completed"
    assert comp_data["completed_at"] is not None
    assert comp_data["progress_current"] == comp_data["progress_target"]

    # Toggle again -> resets to active
    reopen_res = await async_client.patch(f"/api/v1/goals/{goal_id}/complete", headers=headers)
    assert reopen_res.status_code == 200
    reopen_data = reopen_res.json()
    assert reopen_data["status"] == "active"
    assert reopen_data["completed_at"] is None

    # Archive
    archive_res = await async_client.patch(f"/api/v1/goals/{goal_id}/archive", headers=headers)
    assert archive_res.status_code == 200
    archive_data = archive_res.json()
    assert archive_data["status"] == "archived"
    assert archive_data["archived_at"] is not None


@pytest.mark.asyncio
async def test_filtering_and_counts(async_client: AsyncClient):
    """Test filtering by status and verifying aggregated counts."""
    headers = {"Authorization": "Bearer test-user-diana"}

    # Diana creates 2 active goals and 1 completed goal
    res1 = await async_client.post("/api/v1/goals", json={"title": "First Sprout"}, headers=headers)
    assert res1.status_code == 201
    res2 = await async_client.post(
        "/api/v1/goals", json={"title": "Second Sprout"}, headers=headers
    )
    assert res2.status_code == 201
    g3 = await async_client.post(
        "/api/v1/goals", json={"title": "Bloom Completed"}, headers=headers
    )
    g3_id = g3.json()["id"]
    await async_client.patch(f"/api/v1/goals/{g3_id}/complete", headers=headers)

    # List all (no filter)
    all_res = await async_client.get("/api/v1/goals", headers=headers)
    assert all_res.status_code == 200
    data = all_res.json()
    assert data["total"] >= 3
    assert data["active_count"] >= 2
    assert data["completed_count"] >= 1

    # Filter by active
    active_res = await async_client.get("/api/v1/goals?status=active", headers=headers)
    assert active_res.status_code == 200
    assert all(item["status"] == "active" for item in active_res.json()["items"])

    # Filter by completed
    comp_res = await async_client.get("/api/v1/goals?status=completed", headers=headers)
    assert comp_res.status_code == 200
    assert all(item["status"] == "completed" for item in comp_res.json()["items"])


@pytest.mark.asyncio
async def test_delete_goal(async_client: AsyncClient):
    """Test permanent deletion of a goal."""
    headers = {"Authorization": "Bearer test-user-elena"}

    res = await async_client.post(
        "/api/v1/goals", json={"title": "Temporary weed to pull"}, headers=headers
    )
    goal_id = res.json()["id"]

    del_res = await async_client.delete(f"/api/v1/goals/{goal_id}", headers=headers)
    assert del_res.status_code == 204

    get_res = await async_client.get(f"/api/v1/goals/{goal_id}", headers=headers)
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_bulk_delete_unauthorized(async_client: AsyncClient):
    """DELETE /api/v1/goals/bulk without auth token returns 401."""
    res = await async_client.request(
        "DELETE", "/api/v1/goals/bulk", json={"goal_ids": ["some-id"]}
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_bulk_delete_goals(async_client: AsyncClient):
    """DELETE /api/v1/goals/bulk deletes multiple goals in a single request."""
    headers = {"Authorization": "Bearer test-user-bulk-1"}

    # Create 3 goals
    g1 = (await async_client.post("/api/v1/goals", json={"title": "Goal 1"}, headers=headers)).json()["id"]
    g2 = (await async_client.post("/api/v1/goals", json={"title": "Goal 2"}, headers=headers)).json()["id"]
    g3 = (await async_client.post("/api/v1/goals", json={"title": "Goal 3"}, headers=headers)).json()["id"]

    # Delete 2 of them
    del_res = await async_client.request(
        "DELETE",
        "/api/v1/goals/bulk",
        json={"goal_ids": [g1, g2]},
        headers=headers,
    )
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["deleted_count"] == 2
    assert set(del_data["deleted_ids"]) == {g1, g2}

    # Verify g1 and g2 are gone
    assert (await async_client.get(f"/api/v1/goals/{g1}", headers=headers)).status_code == 404
    assert (await async_client.get(f"/api/v1/goals/{g2}", headers=headers)).status_code == 404

    # Verify g3 still exists
    res3 = await async_client.get(f"/api/v1/goals/{g3}", headers=headers)
    assert res3.status_code == 200
    assert res3.json()["title"] == "Goal 3"


@pytest.mark.asyncio
async def test_bulk_delete_post_alias(async_client: AsyncClient):
    """POST /api/v1/goals/bulk-delete works as an alias for bulk deletion."""
    headers = {"Authorization": "Bearer test-user-bulk-post"}

    g1 = (await async_client.post("/api/v1/goals", json={"title": "Post Goal 1"}, headers=headers)).json()["id"]
    g2 = (await async_client.post("/api/v1/goals", json={"title": "Post Goal 2"}, headers=headers)).json()["id"]

    del_res = await async_client.post(
        "/api/v1/goals/bulk-delete",
        json={"goal_ids": [g1, g2]},
        headers=headers,
    )
    assert del_res.status_code == 200
    assert del_res.json()["deleted_count"] == 2


@pytest.mark.asyncio
async def test_bulk_delete_user_isolation(async_client: AsyncClient):
    """A user cannot bulk delete goals belonging to another user."""
    alice_headers = {"Authorization": "Bearer test-user-alice-bulk"}
    bob_headers = {"Authorization": "Bearer test-user-bob-bulk"}

    alice_goal = (
        await async_client.post(
            "/api/v1/goals", json={"title": "Alice's precious orchid"}, headers=alice_headers
        )
    ).json()["id"]

    bob_goal = (
        await async_client.post(
            "/api/v1/goals", json={"title": "Bob's common dandelion"}, headers=bob_headers
        )
    ).json()["id"]

    # Bob attempts to delete both his goal and Alice's goal
    bob_del = await async_client.request(
        "DELETE",
        "/api/v1/goals/bulk",
        json={"goal_ids": [alice_goal, bob_goal]},
        headers=bob_headers,
    )
    assert bob_del.status_code == 200
    del_data = bob_del.json()
    # Only Bob's goal was deleted!
    assert del_data["deleted_count"] == 1
    assert del_data["deleted_ids"] == [bob_goal]

    # Alice's goal is completely untouched and intact
    alice_check = await async_client.get(f"/api/v1/goals/{alice_goal}", headers=alice_headers)
    assert alice_check.status_code == 200
    assert alice_check.json()["title"] == "Alice's precious orchid"


@pytest.mark.asyncio
async def test_bulk_delete_empty_list(async_client: AsyncClient):
    """Empty goal_ids list returns 200 with 0 deleted."""
    headers = {"Authorization": "Bearer test-user-bulk-empty"}
    res = await async_client.request(
        "DELETE", "/api/v1/goals/bulk", json={"goal_ids": []}, headers=headers
    )
    assert res.status_code == 200
    assert res.json()["deleted_count"] == 0
    assert res.json()["deleted_ids"] == []


@pytest.mark.asyncio
async def test_bulk_delete_preserves_durable_achievements(async_client: AsyncClient):
    """Bulk-deleting goals does NOT delete durable achievements earned from those goals."""
    headers = {"Authorization": "Bearer test-user-durable-ach"}

    # Plant and complete goal
    g_res = await async_client.post(
        "/api/v1/goals", json={"title": "First Seed for Achievement"}, headers=headers
    )
    goal_id = g_res.json()["id"]

    # Complete goal to earn milestone
    await async_client.patch(f"/api/v1/goals/{goal_id}/complete", headers=headers)

    # Verify achievement exists
    ach_res = await async_client.get("/api/v1/achievements", headers=headers)
    assert ach_res.status_code == 200
    ach_items = ach_res.json()["items"]
    assert len(ach_items) > 0
    first_ach_id = ach_items[0]["id"]

    # Now bulk delete the goal
    del_res = await async_client.request(
        "DELETE",
        "/api/v1/goals/bulk",
        json={"goal_ids": [goal_id]},
        headers=headers,
    )
    assert del_res.status_code == 200
    assert del_res.json()["deleted_count"] == 1

    # Goal is gone
    assert (await async_client.get(f"/api/v1/goals/{goal_id}", headers=headers)).status_code == 404

    # Achievement MUST STILL EXIST (durability preserved!)
    ach_res_after = await async_client.get("/api/v1/achievements", headers=headers)
    assert ach_res_after.status_code == 200
    remaining_ach_ids = [a["id"] for a in ach_res_after.json()["items"]]
    assert first_ach_id in remaining_ach_ids


@pytest.mark.asyncio
async def test_list_user_reminders_batch(async_client: AsyncClient):
    """GET /api/v1/goals/reminders returns all reminders for the user and enforces isolation."""
    headers_a = {"Authorization": "Bearer test-user-rem-batch-a"}
    headers_b = {"Authorization": "Bearer test-user-rem-batch-b"}

    # Plant a goal for User A
    g_res = await async_client.post(
        "/api/v1/goals", json={"title": "Goal with reminder"}, headers=headers_a
    )
    goal_id = g_res.json()["id"]

    # Create reminder for User A
    rem_res = await async_client.post(
        f"/api/v1/goals/{goal_id}/reminders",
        json={"reminder_time": "19:45", "timezone": "Asia/Kolkata", "is_enabled": True},
        headers=headers_a,
    )
    assert rem_res.status_code == 201

    # User A batch gets reminders
    list_res = await async_client.get("/api/v1/goals/reminders", headers=headers_a)
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) >= 1
    assert any(r["goal_id"] == goal_id and r["reminder_time"] == "19:45" for r in items)

    # User B batch gets reminders -> 0 reminders for User B
    b_res = await async_client.get("/api/v1/goals/reminders", headers=headers_b)
    assert b_res.status_code == 200
    assert not any(r["goal_id"] == goal_id for r in b_res.json()["items"])


