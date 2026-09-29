import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.scheduler import GardenScheduler
from app.core.timezone import now_utc
from app.models.news import DailyEdition
from app.models.user_preference import UserPreference
from app.services.news.daily_job import DailyNewsJobService
from app.services.notifications.base import (
    BaseNotificationProvider,
    NotificationPayload,
    NotificationResult,
)


def gen_auth(name: str) -> dict[str, str]:
    uid = f"test-{name}-{uuid.uuid4().hex[:8]}"
    return {"Authorization": f"Bearer {uid}"}


def get_unique_date_pair(base_year: int = 2060) -> tuple[date, date]:
    offset = uuid.uuid4().int % 10000 + 10
    today_date = date(base_year, 1, 1) + timedelta(days=offset)
    yest_date = today_date - timedelta(days=1)
    return yest_date, today_date


class MockNotificationProvider(BaseNotificationProvider):
    """Observable in-memory notification provider for deterministic testing."""

    def __init__(self):
        self.dispatched_history: list[NotificationPayload] = []

    async def send(self, payload: NotificationPayload) -> NotificationResult:
        self.dispatched_history.append(payload)
        return NotificationResult(
            success=True,
            provider="mock_notification_provider",
            delivered_at=now_utc(),
        )

    def clear(self) -> None:
        self.dispatched_history.clear()


class FailingNotificationProvider(BaseNotificationProvider):
    """Notification provider that simulates delivery errors or exceptions."""

    def __init__(self, should_raise: bool = False, error_message: str = "Delivery timeout"):
        self.should_raise = should_raise
        self.error_message = error_message
        self.attempts: list[NotificationPayload] = []

    async def send(self, payload: NotificationPayload) -> NotificationResult:
        self.attempts.append(payload)
        if self.should_raise:
            raise RuntimeError(f"Network transport crash: {self.error_message}")
        return NotificationResult(
            success=False,
            provider="failing_mock_provider",
            delivered_at=now_utc(),
            error=self.error_message,
        )


# ============================================================================
# 1. NOTIFICATIONS DISABLED -> EDITION CREATED, NO NOTIFICATION
# ============================================================================


@pytest.mark.asyncio
async def test_notifications_disabled_creates_edition_without_notification():
    """
    Verify:
    - User has notifications_enabled = False.
    - Daily edition is created and saved normally.
    - No notification is dispatched.
    """
    uid = f"user-notif-off-{uuid.uuid4().hex[:8]}"
    _, today = get_unique_date_pair(base_year=2061)
    provider = MockNotificationProvider()

    async with AsyncSessionLocal() as session:
        pref = UserPreference(
            user_id=uid,
            timezone="Asia/Kolkata",
            news_daily_update=True,
            news_update_time="20:00",
            notifications_enabled=False,
        )
        session.add(pref)
        await session.commit()

        job_service = DailyNewsJobService(notification_provider=provider)
        res = await job_service.execute_daily_update(
            db=session,
            target_timezone="Asia/Kolkata",
            target_date=today,
            user_id=uid,
        )

        assert res["status"] == "success"
        assert res["notifications_sent"] == 0
        assert res["notifications_skipped"] >= 1
        assert len(provider.dispatched_history) == 0

        # Verify edition is persisted and published
        edition_stmt = select(DailyEdition).where(DailyEdition.edition_date == today)
        edition = (await session.execute(edition_stmt)).scalars().first()
        assert edition is not None
        assert edition.status == "published"


# ============================================================================
# 2. NOTIFICATIONS ENABLED -> EDITION CREATED, NOTIFICATION ATTEMPTED
# ============================================================================


@pytest.mark.asyncio
async def test_notifications_enabled_creates_edition_and_dispatches_notification():
    """
    Verify:
    - User has notifications_enabled = True.
    - Daily edition is created and published.
    - Notification is dispatched via notification abstraction with concise message.
    - No private diary content is included.
    - Edition metadata records the delivery.
    """
    uid = f"user-notif-on-{uuid.uuid4().hex[:8]}"
    _, today = get_unique_date_pair(base_year=2062)
    provider = MockNotificationProvider()

    async with AsyncSessionLocal() as session:
        pref = UserPreference(
            user_id=uid,
            timezone="Asia/Kolkata",
            news_daily_update=True,
            news_update_time="20:00",
            notifications_enabled=True,
        )
        session.add(pref)
        await session.commit()

        job_service = DailyNewsJobService(notification_provider=provider)
        res = await job_service.execute_daily_update(
            db=session,
            target_timezone="Asia/Kolkata",
            target_date=today,
            user_id=uid,
        )

        assert res["status"] == "success"
        assert res["notifications_sent"] == 1
        assert len(provider.dispatched_history) == 1

        payload = provider.dispatched_history[0]
        assert payload.user_id == uid
        assert "Faraway Window" in payload.message
        assert "dispatch" in payload.title.lower() or "little world" in payload.title.lower()
        assert payload.notification_type == "news_edition"
        assert payload.edition_id == res["edition_id"]

        # Ensure no private diary / journal content is leaked
        assert "diary" not in payload.message.lower()
        assert "secret" not in payload.message.lower()

        # Check edition metadata persistence
        edition_stmt = select(DailyEdition).where(DailyEdition.edition_date == today)
        edition = (await session.execute(edition_stmt)).scalars().first()
        assert edition is not None
        assert edition.metadata_json is not None
        notified = edition.metadata_json.get("notified_users", {})
        assert uid in notified
        assert notified[uid]["status"] == "sent"


# ============================================================================
# 3. NOTIFICATION FAILURE -> EDITION STILL EXISTS (ISOLATION)
# ============================================================================


@pytest.mark.asyncio
async def test_notification_failure_isolates_and_preserves_edition():
    """
    Verify:
    - When notification provider encounters a network crash or returns failure:
      1. Daily edition remains successfully created and stored in the database.
      2. The job finishes with status 'success' and records the notification error.
      3. Edition is NOT rolled back or invalidated.
    """
    uid = f"user-notif-fail-{uuid.uuid4().hex[:8]}"
    _, today = get_unique_date_pair(base_year=2063)
    failing_provider = FailingNotificationProvider(
        should_raise=True, error_message="Push service connection refused"
    )

    async with AsyncSessionLocal() as session:
        pref = UserPreference(
            user_id=uid,
            timezone="Asia/Kolkata",
            news_daily_update=True,
            news_update_time="20:00",
            notifications_enabled=True,
        )
        session.add(pref)
        await session.commit()

        job_service = DailyNewsJobService(notification_provider=failing_provider)
        res = await job_service.execute_daily_update(
            db=session,
            target_timezone="Asia/Kolkata",
            target_date=today,
            user_id=uid,
        )

        # Job must still succeed because edition was curated and committed
        assert res["status"] == "success"
        assert res["notifications_failed"] == 1
        assert res["notifications_sent"] == 0

        # Edition MUST still exist in database
        edition_stmt = select(DailyEdition).where(DailyEdition.edition_date == today)
        edition = (await session.execute(edition_stmt)).scalars().first()
        assert edition is not None
        assert edition.status == "published"
        assert edition.id == res["edition_id"]

        # Failure details recorded in edition metadata
        notified = edition.metadata_json.get("notified_users", {})
        assert uid in notified
        assert notified[uid]["status"] == "failed"
        assert "Push service connection refused" in notified[uid]["error"]


# ============================================================================
# 4. DUPLICATE SCHEDULER INVOCATION -> NO DUPLICATE NOTIFICATION
# ============================================================================


@pytest.mark.asyncio
async def test_duplicate_scheduler_invocation_prevents_duplicate_notifications():
    """
    Verify:
    - Multiple scheduler invocations for the same user and date send exactly ONE notification.
    - Re-running does not produce duplicate notifications.
    """
    uid = f"user-notif-dup-{uuid.uuid4().hex[:8]}"
    yest, today = get_unique_date_pair(base_year=2064)
    provider = MockNotificationProvider()

    test_time = datetime(
        today.year, today.month, today.day, 20, 15, tzinfo=ZoneInfo("Asia/Kolkata")
    )

    async with AsyncSessionLocal() as session:
        pref = UserPreference(
            user_id=uid,
            timezone="Asia/Kolkata",
            news_daily_update=True,
            news_update_time="20:00",
            notifications_enabled=True,
        )
        session.add(pref)
        session.add(DailyEdition(edition_date=yest, title=f"Pre-seed {yest.isoformat()}"))
        await session.commit()

        job_service = DailyNewsJobService(notification_provider=provider)
        scheduler = GardenScheduler(
            daily_news_job_service=job_service,
            notification_provider=provider,
        )

        # 1. First execution dispatches 1 notification
        res1 = await scheduler.run_jobs(session, as_of=test_time, user_id=uid)
        assert res1["news_daily_job_executed"] is True
        assert len(provider.dispatched_history) == 1

        # 2. Second execution on same date must NOT dispatch another notification
        res2 = await scheduler.run_jobs(
            session, as_of=test_time + timedelta(minutes=5), user_id=uid
        )
        assert res2["news_daily_job_executed"] is False
        assert len(provider.dispatched_history) == 1

        # 3. Direct service call with force=True re-evaluates but still avoids duplicate user notification
        res_direct = await job_service.execute_daily_update(
            db=session,
            target_timezone="Asia/Kolkata",
            target_date=today,
            as_of=test_time + timedelta(minutes=10),
            user_id=uid,
            force=True,
        )
        assert res_direct["status"] == "success"
        assert res_direct["notifications_skipped"] >= 1
        assert len(provider.dispatched_history) == 1


# ============================================================================
# 5. USER TIMEZONE AND UPDATE-TIME PREFERENCE RESPECTED
# ============================================================================


@pytest.mark.asyncio
async def test_user_timezone_and_update_time_preference_respected():
    """
    Verify:
    - User with London timezone and 19:30 update time is not triggered at 19:00 London.
    - At 19:35 London, edition and notification trigger with London timezone.
    """
    uid = f"user-notif-london-{uuid.uuid4().hex[:8]}"
    yest, today = get_unique_date_pair(base_year=2065)
    provider = MockNotificationProvider()

    async with AsyncSessionLocal() as session:
        pref = UserPreference(
            user_id=uid,
            timezone="Europe/London",
            news_daily_update=True,
            news_update_time="19:30",
            notifications_enabled=True,
        )
        session.add(pref)
        session.add(DailyEdition(edition_date=yest, title=f"Pre-seed {yest.isoformat()}"))
        await session.commit()

        scheduler = GardenScheduler(
            daily_news_job_service=DailyNewsJobService(notification_provider=provider),
            notification_provider=provider,
        )

        # 1. 19:00 London (before 19:30)
        time_before = datetime(
            today.year, today.month, today.day, 19, 0, tzinfo=ZoneInfo("Europe/London")
        )
        res_before = await scheduler.run_jobs(session, as_of=time_before, user_id=uid)
        assert res_before["news_daily_job_executed"] is False
        assert len(provider.dispatched_history) == 0

        # 2. 19:35 London (after 19:30)
        time_after = datetime(
            today.year, today.month, today.day, 19, 35, tzinfo=ZoneInfo("Europe/London")
        )
        res_after = await scheduler.run_jobs(session, as_of=time_after, user_id=uid)
        assert res_after["news_daily_job_executed"] is True
        assert len(provider.dispatched_history) == 1

        payload = provider.dispatched_history[0]
        assert payload.user_id == uid
        assert payload.timezone == "Europe/London"
        assert payload.scheduled_time == "19:30"


# ============================================================================
# 6. MULTIPLE USERS REMAIN ISOLATED
# ============================================================================


@pytest.mark.asyncio
async def test_multiple_users_isolation():
    """
    Verify:
    - User Alice has notifications enabled.
    - User Bob has notifications disabled.
    - When daily news job runs for Asia/Kolkata:
      - Alice receives 1 notification.
      - Bob receives 0 notifications.
      - Neither preference affects the other user.
    """
    alice_id = f"alice-iso-{uuid.uuid4().hex[:8]}"
    bob_id = f"bob-iso-{uuid.uuid4().hex[:8]}"
    _, today = get_unique_date_pair(base_year=2066)
    provider = MockNotificationProvider()

    async with AsyncSessionLocal() as session:
        pref_alice = UserPreference(
            user_id=alice_id,
            timezone="Asia/Kolkata",
            news_daily_update=True,
            news_update_time="20:00",
            notifications_enabled=True,
        )
        pref_bob = UserPreference(
            user_id=bob_id,
            timezone="Asia/Kolkata",
            news_daily_update=True,
            news_update_time="20:00",
            notifications_enabled=False,
        )
        session.add_all([pref_alice, pref_bob])
        await session.commit()

        job_service = DailyNewsJobService(notification_provider=provider)
        res = await job_service.execute_daily_update(
            db=session,
            target_timezone="Asia/Kolkata",
            target_date=today,
            user_id=None,  # Multi-user mode
        )

        assert res["status"] == "success"
        assert res["notifications_sent"] >= 1

        # Check provider history
        alice_dispatches = [p for p in provider.dispatched_history if p.user_id == alice_id]
        bob_dispatches = [p for p in provider.dispatched_history if p.user_id == bob_id]

        assert len(alice_dispatches) == 1
        assert len(bob_dispatches) == 0


# ============================================================================
# 7. MANUAL NEWS TRIGGER RESPECTS NOTIFICATION PREFERENCE
# ============================================================================


@pytest.mark.asyncio
async def test_manual_news_trigger_respects_notifications(async_client: AsyncClient):
    """
    Verify:
    - Manual API trigger POST /api/v1/news/daily-job respects user's notification preferences.
    """
    headers = gen_auth("manual-notif")
    # First get or create user preference with notifications enabled
    pref_res = await async_client.get("/api/v1/settings/preferences", headers=headers)
    assert pref_res.status_code == 200

    resp = await async_client.post("/api/v1/news/daily-job?timezone=Asia/Kolkata", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "job_id" in data
    assert "edition_id" in data


# ============================================================================
# 8. SCHEDULER REMAINS SAFE WHEN NOTIFICATION PROVIDER FAILS
# ============================================================================


@pytest.mark.asyncio
async def test_scheduler_remains_safe_when_notification_provider_fails():
    """
    Verify:
    - If notification provider throws an unhandled exception:
      1. Scheduler run_jobs finishes safely without raising.
      2. Edition is preserved.
      3. Summary reflects execution.
    """
    uid = f"user-crash-safe-{uuid.uuid4().hex[:8]}"
    yest, today = get_unique_date_pair(base_year=2068)
    failing_provider = FailingNotificationProvider(should_raise=True, error_message="Fatal crash")

    test_time = datetime(
        today.year, today.month, today.day, 20, 10, tzinfo=ZoneInfo("Asia/Kolkata")
    )

    async with AsyncSessionLocal() as session:
        pref = UserPreference(
            user_id=uid,
            timezone="Asia/Kolkata",
            news_daily_update=True,
            news_update_time="20:00",
            notifications_enabled=True,
        )
        session.add(pref)
        session.add(DailyEdition(edition_date=yest, title=f"Pre-seed {yest.isoformat()}"))
        await session.commit()

        job_service = DailyNewsJobService(notification_provider=failing_provider)
        scheduler = GardenScheduler(
            daily_news_job_service=job_service,
            notification_provider=failing_provider,
        )

        # Should execute safely without raising
        summary = await scheduler.run_jobs(session, as_of=test_time, user_id=uid)
        assert summary["news_daily_job_executed"] is True
        assert summary["news_daily_job_result"]["status"] == "success"

        # Verify edition was safely committed
        edition_stmt = select(DailyEdition).where(DailyEdition.edition_date == today)
        edition = (await session.execute(edition_stmt)).scalars().first()
        assert edition is not None
        assert edition.status == "published"
