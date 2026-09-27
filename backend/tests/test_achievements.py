import uuid

import pytest
from httpx import AsyncClient


def gen_auth(prefix: str = "user") -> dict[str, str]:
    uid = f"test-achieve-{prefix}-{uuid.uuid4().hex[:8]}"
    return {"Authorization": f"Bearer {uid}"}


@pytest.mark.asyncio
async def test_first_goal_creates_first_step_achievement(async_client: AsyncClient):
    """3. First completed goal creates 'First Step'."""
    user = gen_auth("first-step")

    # Initially zero achievements
    ach_res = await async_client.get("/api/v1/achievements", headers=user)
    assert ach_res.status_code == 200
    assert ach_res.json()["total"] == 0

    # Create a goal
    goal_res = await async_client.post(
        "/api/v1/goals",
        json={"title": "Plant a sunflower"},
        headers=user,
    )
    assert goal_res.status_code == 201
    goal_id = goal_res.json()["id"]

    # Toggle complete
    comp_res = await async_client.patch(f"/api/v1/goals/{goal_id}/complete", headers=user)
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "completed"

    # Achievements now contains "First Step"
    ach_res = await async_client.get("/api/v1/achievements", headers=user)
    assert ach_res.status_code == 200
    data = ach_res.json()
    assert data["total"] == 1
    ach = data["items"][0]
    assert ach["milestone_key"] == "first_goal"
    assert ach["title"] == "First Step"
    assert ach["description"] == "You completed your first goal."
    assert ach["category"] == "milestone"
    assert ach["icon"] == "🌱"
    assert ach["source_type"] == "goal"
    assert ach["source_id"] == goal_id


@pytest.mark.asyncio
async def test_duplicate_completion_does_not_duplicate_achievement(async_client: AsyncClient):
    """4. Completing the same goal twice does not create duplicate achievement.
    11. Achievement generation is idempotent."""
    user = gen_auth("duplicate")

    # Create and complete goal
    g_res = await async_client.post("/api/v1/goals", json={"title": "Evening Tea"}, headers=user)
    g_id = g_res.json()["id"]

    # Complete
    await async_client.patch(f"/api/v1/goals/{g_id}/complete", headers=user)

    # Check 1 achievement
    ach1 = await async_client.get("/api/v1/achievements", headers=user)
    assert ach1.json()["total"] == 1

    # Toggle back to active, then complete again
    await async_client.patch(f"/api/v1/goals/{g_id}/complete", headers=user)
    await async_client.patch(f"/api/v1/goals/{g_id}/complete", headers=user)

    # Still exactly 1 achievement
    ach2 = await async_client.get("/api/v1/achievements", headers=user)
    assert ach2.json()["total"] == 1


@pytest.mark.asyncio
async def test_five_and_ten_goals_milestones(async_client: AsyncClient):
    """5. Five completed goals creates the five-goal achievement.
    6. Ten completed goals creates the ten-goal achievement."""
    user = gen_auth("steps")

    # Create and complete 4 goals
    for i in range(1, 5):
        g = await async_client.post("/api/v1/goals", json={"title": f"Goal {i}"}, headers=user)
        await async_client.patch(f"/api/v1/goals/{g.json()['id']}/complete", headers=user)

    # At 4 completed goals: only 'first_goal'
    ach4 = await async_client.get("/api/v1/achievements", headers=user)
    keys4 = [a["milestone_key"] for a in ach4.json()["items"]]
    assert "first_goal" in keys4
    assert "completed_5_goals" not in keys4

    # 5th goal completed
    g5 = await async_client.post("/api/v1/goals", json={"title": "Goal 5"}, headers=user)
    await async_client.patch(f"/api/v1/goals/{g5.json()['id']}/complete", headers=user)

    ach5 = await async_client.get("/api/v1/achievements", headers=user)
    keys5 = [a["milestone_key"] for a in ach5.json()["items"]]
    assert "first_goal" in keys5
    assert "completed_5_goals" in keys5
    five_ach = next(a for a in ach5.json()["items"] if a["milestone_key"] == "completed_5_goals")
    assert five_ach["title"] == "Five Little Steps"
    assert five_ach["description"] == "You completed five goals."

    # Complete 5 more goals (to reach 10)
    for i in range(6, 11):
        g = await async_client.post("/api/v1/goals", json={"title": f"Goal {i}"}, headers=user)
        await async_client.patch(f"/api/v1/goals/{g.json()['id']}/complete", headers=user)

    ach10 = await async_client.get("/api/v1/achievements", headers=user)
    keys10 = [a["milestone_key"] for a in ach10.json()["items"]]
    assert "completed_10_goals" in keys10
    ten_ach = next(a for a in ach10.json()["items"] if a["milestone_key"] == "completed_10_goals")
    assert ten_ach["title"] == "A Growing Path"
    assert ten_ach["description"] == "You completed ten goals."


@pytest.mark.asyncio
async def test_recurring_goal_milestones(async_client: AsyncClient):
    """7. First recurring instance completion creates 'Rhythm Found'.
    8. Four recurring completions creates 'A Gentle Rhythm'."""
    user = gen_auth("recurring")

    # Create a daily recurring goal
    g = await async_client.post(
        "/api/v1/goals",
        json={"title": "Morning Stretch", "recurrence_cadence": "daily"},
        headers=user,
    )
    goal_id = g.json()["id"]

    # Trigger scheduler/generation
    await async_client.post("/api/v1/goals/scheduler/trigger", headers=user)

    inst_res = await async_client.get(f"/api/v1/goals/{goal_id}/instances", headers=user)
    instances = inst_res.json()["items"]
    assert len(instances) >= 1
    inst_1 = instances[0]

    # Complete first recurring instance
    c_res = await async_client.patch(
        f"/api/v1/goals/instances/{inst_1['id']}/complete", headers=user
    )
    assert c_res.status_code == 200

    # Should have "Rhythm Found"
    ach_res = await async_client.get("/api/v1/achievements", headers=user)
    keys = [a["milestone_key"] for a in ach_res.json()["items"]]
    assert "first_recurring_instance" in keys
    rhythm = next(
        a for a in ach_res.json()["items"] if a["milestone_key"] == "first_recurring_instance"
    )
    assert rhythm["title"] == "Rhythm Found"
    assert rhythm["description"] == "You completed a recurring intention for the first time."
    assert rhythm["category"] == "recurring"

    # Complete 3 more recurring instances using another goal or periods
    for i in range(2, 5):
        rg = await async_client.post(
            "/api/v1/goals",
            json={"title": f"Habit {i}", "recurrence_cadence": "weekly"},
            headers=user,
        )
        await async_client.post("/api/v1/goals/scheduler/trigger", headers=user)
        r_insts = await async_client.get(f"/api/v1/goals/{rg.json()['id']}/instances", headers=user)
        await async_client.patch(
            f"/api/v1/goals/instances/{r_insts.json()['items'][0]['id']}/complete",
            headers=user,
        )

    # Should have "A Gentle Rhythm" (4 recurring completions)
    ach_4 = await async_client.get("/api/v1/achievements", headers=user)
    keys_4 = [a["milestone_key"] for a in ach_4.json()["items"]]
    assert "completed_4_recurring_instances" in keys_4
    gentle = next(
        a for a in ach_4.json()["items"] if a["milestone_key"] == "completed_4_recurring_instances"
    )
    assert gentle["title"] == "A Gentle Rhythm"
    assert gentle["description"] == "You completed four recurring intentions."


@pytest.mark.asyncio
async def test_first_monthly_recurring_milestone(async_client: AsyncClient):
    """9. First monthly recurring completion creates 'A Month Remembered'."""
    user = gen_auth("monthly")

    # Create monthly recurring goal
    g = await async_client.post(
        "/api/v1/goals",
        json={"title": "Monthly Reflection", "recurrence_cadence": "monthly"},
        headers=user,
    )
    goal_id = g.json()["id"]

    await async_client.post("/api/v1/goals/scheduler/trigger", headers=user)
    insts = await async_client.get(f"/api/v1/goals/{goal_id}/instances", headers=user)
    inst = insts.json()["items"][0]

    # Complete monthly instance
    await async_client.patch(f"/api/v1/goals/instances/{inst['id']}/complete", headers=user)

    ach_res = await async_client.get("/api/v1/achievements", headers=user)
    keys = [a["milestone_key"] for a in ach_res.json()["items"]]
    assert "first_monthly_instance" in keys
    monthly_ach = next(
        a for a in ach_res.json()["items"] if a["milestone_key"] == "first_monthly_instance"
    )
    assert monthly_ach["title"] == "A Month Remembered"
    assert monthly_ach["description"] == "You completed your first monthly intention."
    assert monthly_ach["category"] == "recurring"


@pytest.mark.asyncio
async def test_major_goal_something_finished(async_client: AsyncClient):
    """G. When a goal with meaningful progress reaches 100%: 'Something Finished'."""
    user = gen_auth("major")

    # Create a goal with meaningful progress target > 1
    g = await async_client.post(
        "/api/v1/goals",
        json={
            "title": "Read War and Peace",
            "progress_target": 12,
            "progress_current": 11,
        },
        headers=user,
    )
    goal_id = g.json()["id"]

    # Increment to 12 and mark complete
    await async_client.patch(
        f"/api/v1/goals/{goal_id}",
        json={"progress_current": 12, "status": "completed"},
        headers=user,
    )

    ach_res = await async_client.get("/api/v1/achievements", headers=user)
    keys = [a["milestone_key"] for a in ach_res.json()["items"]]
    assert f"major_goal_{goal_id}" in keys
    major = next(
        a for a in ach_res.json()["items"] if a["milestone_key"] == f"major_goal_{goal_id}"
    )
    assert major["title"] == "Something Finished"
    assert major["description"] == "You brought an important intention to completion."
    assert major["category"] == "progress"


@pytest.mark.asyncio
async def test_achievement_remains_available_if_source_goal_archived_or_deleted(
    async_client: AsyncClient,
):
    """10. Achievement remains available even if its source goal is archived (and deleted)."""
    user = gen_auth("durable")

    # Create and complete goal
    g = await async_client.post("/api/v1/goals", json={"title": "Everlasting Sprout"}, headers=user)
    goal_id = g.json()["id"]
    await async_client.patch(f"/api/v1/goals/{goal_id}/complete", headers=user)

    # Verify achievement exists
    ach_res1 = await async_client.get("/api/v1/achievements", headers=user)
    assert ach_res1.json()["total"] == 1
    ach_id = ach_res1.json()["items"][0]["id"]

    # Archive the goal
    await async_client.patch(f"/api/v1/goals/{goal_id}/archive", headers=user)

    # Achievement still exists and is accessible
    ach_res2 = await async_client.get(f"/api/v1/achievements/{ach_id}", headers=user)
    assert ach_res2.status_code == 200
    assert ach_res2.json()["id"] == ach_id

    # Now permanently delete the goal
    del_res = await async_client.delete(f"/api/v1/goals/{goal_id}", headers=user)
    assert del_res.status_code == 204

    # Achievement remains completely intact and accessible!
    ach_res3 = await async_client.get(f"/api/v1/achievements/{ach_id}", headers=user)
    assert ach_res3.status_code == 200
    assert ach_res3.json()["id"] == ach_id
    assert ach_res3.json()["source_id"] == goal_id


@pytest.mark.asyncio
async def test_user_can_retrieve_own_achievements_and_isolation(async_client: AsyncClient):
    """1. User can retrieve their own achievements.
    2. User cannot retrieve another user's achievement.
    12. Different users can independently earn the same achievement."""
    alice = gen_auth("alice")
    bob = gen_auth("bob")

    # Alice completes a goal
    ga = await async_client.post("/api/v1/goals", json={"title": "Alice Goal"}, headers=alice)
    await async_client.patch(f"/api/v1/goals/{ga.json()['id']}/complete", headers=alice)

    alice_achs = await async_client.get("/api/v1/achievements", headers=alice)
    assert alice_achs.json()["total"] == 1
    alice_ach_id = alice_achs.json()["items"][0]["id"]

    # Bob initially has zero achievements
    bob_achs = await async_client.get("/api/v1/achievements", headers=bob)
    assert bob_achs.json()["total"] == 0

    # Bob tries to access Alice's achievement directly: 404
    bob_access = await async_client.get(f"/api/v1/achievements/{alice_ach_id}", headers=bob)
    assert bob_access.status_code == 404

    # Bob independently completes a goal -> earns his own "First Step"
    gb = await async_client.post("/api/v1/goals", json={"title": "Bob Goal"}, headers=bob)
    await async_client.patch(f"/api/v1/goals/{gb.json()['id']}/complete", headers=bob)

    bob_achs2 = await async_client.get("/api/v1/achievements", headers=bob)
    assert bob_achs2.json()["total"] == 1
    bob_ach = bob_achs2.json()["items"][0]
    assert bob_ach["title"] == "First Step"
    assert bob_ach["id"] != alice_ach_id


@pytest.mark.asyncio
async def test_achievement_list_ordered_newest_first(async_client: AsyncClient):
    """13. Achievement list is ordered newest first."""
    user = gen_auth("ordering")

    # Create 5 goals and complete them
    for i in range(1, 6):
        g = await async_client.post("/api/v1/goals", json={"title": f"Goal {i}"}, headers=user)
        await async_client.patch(f"/api/v1/goals/{g.json()['id']}/complete", headers=user)

    res = await async_client.get("/api/v1/achievements", headers=user)
    items = res.json()["items"]
    assert len(items) == 2  # first_goal and completed_5_goals

    # Newest achievement (completed_5_goals) is first
    assert items[0]["milestone_key"] == "completed_5_goals"
    assert items[1]["milestone_key"] == "first_goal"
    assert items[0]["achieved_at"] >= items[1]["achieved_at"]


@pytest.mark.asyncio
async def test_category_filtering(async_client: AsyncClient):
    """Category query param filters list."""
    user = gen_auth("cat-filter")

    # Complete regular goal (milestone category)
    g = await async_client.post("/api/v1/goals", json={"title": "Regular"}, headers=user)
    await async_client.patch(f"/api/v1/goals/{g.json()['id']}/complete", headers=user)

    # Complete recurring goal (recurring category)
    rg = await async_client.post(
        "/api/v1/goals",
        json={"title": "Recurring", "recurrence_cadence": "daily"},
        headers=user,
    )
    await async_client.post("/api/v1/goals/scheduler/trigger", headers=user)
    insts = await async_client.get(f"/api/v1/goals/{rg.json()['id']}/instances", headers=user)
    await async_client.patch(
        f"/api/v1/goals/instances/{insts.json()['items'][0]['id']}/complete",
        headers=user,
    )

    # Filter milestone
    m_res = await async_client.get("/api/v1/achievements?category=milestone", headers=user)
    assert m_res.status_code == 200
    assert all(a["category"] == "milestone" for a in m_res.json()["items"])
    assert len(m_res.json()["items"]) == 1

    # Filter recurring
    r_res = await async_client.get("/api/v1/achievements?category=recurring", headers=user)
    assert r_res.status_code == 200
    assert all(a["category"] == "recurring" for a in r_res.json()["items"])
    assert len(r_res.json()["items"]) == 1
