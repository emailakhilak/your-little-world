from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient

from app.services.notifications.log_provider import default_notification_provider


@pytest.mark.asyncio
async def test_recurring_goal_and_instance_lifecycle(async_client: AsyncClient):
    """
    Test creating a recurring goal, generating its occurrence,
    and verifying that completing the occurrence preserves the parent goal.
    """
    headers = {"Authorization": "Bearer test-user-gardener-recur"}

    # 1. Create a daily recurring goal
    create_res = await async_client.post(
        "/api/v1/goals",
        json={
            "title": "Water the evening orchids",
            "category": "habit",
            "recurrence_cadence": "daily",
            "icon": "🌸",
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    goal_data = create_res.json()
    goal_id = goal_data["id"]
    assert goal_data["recurrence_cadence"] == "daily"
    assert goal_data["status"] == "active"

    # 2. Check generated instances
    inst_res = await async_client.get(
        f"/api/v1/goals/{goal_id}/instances",
        headers=headers,
    )
    assert inst_res.status_code == 200
    inst_items = inst_res.json()["items"]
    assert len(inst_items) >= 1
    instance = inst_items[0]
    instance_id = instance["id"]
    assert instance["goal_id"] == goal_id
    assert instance["user_id"] == "test-user-gardener-recur"
    assert instance["status"] == "active"

    # 3. Complete today's occurrence
    comp_res = await async_client.patch(
        f"/api/v1/goals/instances/{instance_id}/complete",
        headers=headers,
    )
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["status"] == "completed"
    assert comp_data["completed_at"] is not None

    # 4. Verify parent goal is STILL active!
    parent_res = await async_client.get(
        f"/api/v1/goals/{goal_id}",
        headers=headers,
    )
    assert parent_res.status_code == 200
    assert parent_res.json()["status"] == "active"

    # 5. Idempotency test: Run generation again, ensure no duplicate instance is created
    gen_again = await async_client.post(
        "/api/v1/goals/instances/generate",
        headers=headers,
    )
    assert gen_again.status_code == 200
    # List instances again - count must not have duplicated
    inst_res2 = await async_client.get(
        f"/api/v1/goals/{goal_id}/instances",
        headers=headers,
    )
    assert len(inst_res2.json()["items"]) == len(inst_items)


@pytest.mark.asyncio
async def test_instance_user_isolation(async_client: AsyncClient):
    """User B cannot view or complete User A's occurrences."""
    user_a = {"Authorization": "Bearer test-user-recur-alice"}
    user_b = {"Authorization": "Bearer test-user-recur-bob"}

    # Alice creates a recurring goal
    res = await async_client.post(
        "/api/v1/goals",
        json={"title": "Alice's Daily Solitude", "recurrence_cadence": "daily"},
        headers=user_a,
    )
    assert res.status_code == 201
    goal_id = res.json()["id"]

    # Get Alice's instance
    instances = await async_client.get(f"/api/v1/goals/{goal_id}/instances", headers=user_a)
    assert instances.status_code == 200
    alice_inst_id = instances.json()["items"][0]["id"]

    # Bob tries to view Alice's instances: 404
    bob_view = await async_client.get(f"/api/v1/goals/{goal_id}/instances", headers=user_b)
    assert bob_view.status_code == 404

    # Bob tries to complete Alice's instance: 404
    bob_comp = await async_client.patch(
        f"/api/v1/goals/instances/{alice_inst_id}/complete", headers=user_b
    )
    assert bob_comp.status_code == 404


@pytest.mark.asyncio
async def test_reminders_crud_and_isolation(async_client: AsyncClient):
    """Test full CRUD and ownership enforcement for goal reminders."""
    alice_headers = {"Authorization": "Bearer test-user-rem-alice"}
    bob_headers = {"Authorization": "Bearer test-user-rem-bob"}

    # 1. Alice creates a goal
    goal_res = await async_client.post(
        "/api/v1/goals",
        json={"title": "Evening Tea Ritual"},
        headers=alice_headers,
    )
    assert goal_res.status_code == 201
    goal_id = goal_res.json()["id"]

    # 2. Bob cannot create reminder for Alice's goal
    bob_create = await async_client.post(
        f"/api/v1/goals/{goal_id}/reminders",
        json={"reminder_time": "18:30", "timezone": "Asia/Kolkata"},
        headers=bob_headers,
    )
    assert bob_create.status_code == 404

    # 3. Alice creates a reminder
    alice_create = await async_client.post(
        f"/api/v1/goals/{goal_id}/reminders",
        json={"reminder_time": "18:30", "timezone": "Asia/Kolkata", "is_enabled": True},
        headers=alice_headers,
    )
    assert alice_create.status_code == 201
    rem_data = alice_create.json()
    rem_id = rem_data["id"]
    assert rem_data["reminder_time"] == "18:30"
    assert rem_data["timezone"] == "Asia/Kolkata"
    assert rem_data["is_enabled"] is True

    # 4. Alice lists reminders for this goal
    list_res = await async_client.get(
        f"/api/v1/goals/{goal_id}/reminders",
        headers=alice_headers,
    )
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 1

    # 5. Alice updates reminder (disables it)
    update_res = await async_client.patch(
        f"/api/v1/goals/reminders/{rem_id}",
        json={"is_enabled": False, "reminder_time": "19:00"},
        headers=alice_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["is_enabled"] is False
    assert update_res.json()["reminder_time"] == "19:00"

    # 6. Bob cannot delete Alice's reminder
    bob_del = await async_client.delete(
        f"/api/v1/goals/reminders/{rem_id}",
        headers=bob_headers,
    )
    assert bob_del.status_code == 404

    # 7. Alice deletes reminder
    alice_del = await async_client.delete(
        f"/api/v1/goals/reminders/{rem_id}",
        headers=alice_headers,
    )
    assert alice_del.status_code == 204


@pytest.mark.asyncio
async def test_due_reminder_processing_and_duplicate_prevention(async_client: AsyncClient):
    """
    Test that due reminders trigger notifications and do not trigger twice
    on the same day (idempotent duplicate prevention).
    """
    headers = {"Authorization": "Bearer test-user-rem-due"}
    default_notification_provider.clear_history()

    # Create goal & reminder scheduled for 09:00 in Asia/Kolkata
    g_res = await async_client.post(
        "/api/v1/goals",
        json={"title": "Morning dew inspection", "description": "Check the seedling leaves."},
        headers=headers,
    )
    goal_id = g_res.json()["id"]

    await async_client.post(
        f"/api/v1/goals/{goal_id}/reminders",
        json={"reminder_time": "09:00", "timezone": "Asia/Kolkata", "is_enabled": True},
        headers=headers,
    )

    # 1. Trigger scheduler pass at 08:30 AM (before 09:00) -> reminder should NOT fire
    early_time = datetime(2026, 9, 27, 8, 30, tzinfo=ZoneInfo("Asia/Kolkata"))
    from app.core.database import AsyncSessionLocal
    from app.services.reminder_service import ReminderService

    reminder_service = ReminderService(notification_provider=default_notification_provider)
    async with AsyncSessionLocal() as session:
        fired_count = await reminder_service.process_due_reminders(session, as_of=early_time)
        assert fired_count == 0
        assert len(default_notification_provider.dispatched_history) == 0

    # 2. Trigger scheduler pass at 09:15 AM (after 09:00) -> reminder MUST fire!
    due_time = datetime(2026, 9, 27, 9, 15, tzinfo=ZoneInfo("Asia/Kolkata"))
    async with AsyncSessionLocal() as session:
        fired_count = await reminder_service.process_due_reminders(session, as_of=due_time)
        assert fired_count >= 1
        assert len(default_notification_provider.dispatched_history) >= 1
        last_notif = default_notification_provider.dispatched_history[-1]
        assert "Morning dew inspection" in last_notif.title

    # 3. Trigger scheduler pass AGAIN at 09:30 AM on the SAME day -> must NOT fire again!
    history_len = len(default_notification_provider.dispatched_history)
    later_time = datetime(2026, 9, 27, 9, 30, tzinfo=ZoneInfo("Asia/Kolkata"))
    async with AsyncSessionLocal() as session:
        fired_count = await reminder_service.process_due_reminders(session, as_of=later_time)
        assert fired_count == 0
        # Notification count has not increased
        assert len(default_notification_provider.dispatched_history) == history_len


@pytest.mark.asyncio
async def test_scheduler_api_trigger(async_client: AsyncClient):
    """Test manual trigger of full scheduler pass via API endpoint."""
    headers = {"Authorization": "Bearer test-user-scheduler"}
    response = await async_client.post("/api/v1/goals/scheduler/run", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "instances_generated" in data
    assert "reminders_processed" in data
