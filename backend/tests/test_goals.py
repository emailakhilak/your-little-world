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
