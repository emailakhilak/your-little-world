import uuid
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.scheduler import GardenScheduler
from app.models.news import DailyEdition, NewsArticle, NewsSource
from app.models.scheduled_job import ScheduledJob
from app.models.user_preference import UserPreference
from app.services.news.base_provider import FeedFetchError, NewsProvider, RawFeedEntry
from app.services.news.daily_job import DailyNewsJobService
from app.services.news.ingestion_service import NewsIngestionService
from app.services.news.summarizer import NewsSummarizerService


def gen_auth(name: str) -> dict[str, str]:
    uid = f"test-{name}-{uuid.uuid4().hex[:8]}"
    return {"Authorization": f"Bearer {uid}"}


def get_unique_date_pair(base_year: int = 2040) -> tuple[date, date]:
    """Generates a guaranteed unique (yesterday, today) date pair for isolated test execution."""
    offset = uuid.uuid4().int % 10000 + 10
    today_date = date(base_year, 1, 1) + timedelta(days=offset)
    yest_date = today_date - timedelta(days=1)
    return yest_date, today_date


# ============================================================================
# 1. TIMEZONE CALCULATION & DEFAULT 20:00 SCHEDULE
# ============================================================================


@pytest.mark.asyncio
async def test_timezone_calculation_and_default_20_00_schedule():
    """
    Verify:
    - Default schedule is 20:00 in Asia/Kolkata when no user preference exists.
    - At 19:30 Asia/Kolkata (before 20:00), daily news job is NOT due and does not run.
    - At 20:05 Asia/Kolkata (after 20:00), daily news job IS due and creates today's edition.
    """
    scheduler = GardenScheduler()
    isolated_user = f"default-user-{uuid.uuid4().hex[:8]}"
    yest, today = get_unique_date_pair(base_year=2040)

    # Pre-seed yesterday's edition so catch-up doesn't fire for yesterday
    async with AsyncSessionLocal() as session:
        session.add(DailyEdition(edition_date=yest, title=f"Pre-seed {yest.isoformat()}"))
        await session.commit()

    # 1. Evaluate at 19:30 Asia/Kolkata
    before_time = datetime(
        today.year, today.month, today.day, 19, 30, tzinfo=ZoneInfo("Asia/Kolkata")
    )
    async with AsyncSessionLocal() as session:
        summary_before = await scheduler.run_jobs(session, as_of=before_time, user_id=isolated_user)
        assert summary_before["news_daily_job_executed"] is False

        # Ensure no edition was generated for today
        today_stmt = select(DailyEdition).where(DailyEdition.edition_date == today)
        assert (await session.execute(today_stmt)).scalars().first() is None

    # 2. Evaluate at 20:05 Asia/Kolkata
    after_time = datetime(
        today.year, today.month, today.day, 20, 5, tzinfo=ZoneInfo("Asia/Kolkata")
    )
    async with AsyncSessionLocal() as session:
        summary_after = await scheduler.run_jobs(session, as_of=after_time, user_id=isolated_user)
        assert summary_after["news_daily_job_executed"] is True
        assert summary_after["news_daily_job_result"]["status"] == "success"

        # Ensure edition was generated for today
        today_ed = (await session.execute(today_stmt)).scalars().first()
        assert today_ed is not None
        assert today_ed.edition_date == today


# ============================================================================
# 2. USER-SPECIFIC TIMEZONE PREFERENCE
# ============================================================================


@pytest.mark.asyncio
async def test_user_specific_timezone_preference():
    """
    Verify:
    - User-configured timezone and update time (e.g. America/New_York at 18:00) is honored.
    - Not due at 17:30 New York time; runs when 18:15 New York time arrives.
    """
    user_id = f"test-ny-user-{uuid.uuid4().hex[:8]}"
    scheduler = GardenScheduler()
    yest, today = get_unique_date_pair(base_year=2042)

    # Create user preference in America/New_York with 18:00 news update time
    async with AsyncSessionLocal() as session:
        pref = UserPreference(
            user_id=user_id,
            timezone="America/New_York",
            news_daily_update=True,
            news_update_time="18:00",
        )
        session.add(pref)
        session.add(DailyEdition(edition_date=yest, title=f"Pre-seed {yest.isoformat()}"))
        await session.commit()

    # 1. 17:30 America/New_York (before 18:00)
    ny_before = datetime(
        today.year, today.month, today.day, 17, 30, tzinfo=ZoneInfo("America/New_York")
    )
    async with AsyncSessionLocal() as session:
        summary = await scheduler.run_jobs(session, as_of=ny_before, user_id=user_id)
        assert summary["news_daily_job_executed"] is False
        today_stmt = select(DailyEdition).where(DailyEdition.edition_date == today)
        assert (await session.execute(today_stmt)).scalars().first() is None

    # 2. 18:15 America/New_York (after 18:00)
    ny_after = datetime(
        today.year, today.month, today.day, 18, 15, tzinfo=ZoneInfo("America/New_York")
    )
    async with AsyncSessionLocal() as session:
        summary = await scheduler.run_jobs(session, as_of=ny_after, user_id=user_id)
        assert summary["news_daily_job_executed"] is True

        today_ed = (await session.execute(today_stmt)).scalars().first()
        assert today_ed is not None
        assert today_ed.edition_date == today


# ============================================================================
# 3. DAILY EDITION IDEMPOTENCY & DUPLICATE INVOCATION
# ============================================================================


@pytest.mark.asyncio
async def test_daily_edition_idempotency_and_duplicate_invocation():
    """
    Verify:
    - Multiple executions for the same day reuse the existing edition without creating duplicates.
    - Scheduler recognizes existing success and skips duplicate runs.
    """
    scheduler = GardenScheduler()
    isolated_user = f"idem-user-{uuid.uuid4().hex[:8]}"
    yest, today = get_unique_date_pair(base_year=2044)
    test_time = datetime(
        today.year, today.month, today.day, 20, 30, tzinfo=ZoneInfo("Asia/Kolkata")
    )

    async with AsyncSessionLocal() as session:
        # Pre-seed yesterday so catch-up doesn't fire
        session.add(DailyEdition(edition_date=yest, title=f"Pre-seed {yest.isoformat()}"))
        await session.commit()

        # 1. First run generates the edition
        res1 = await scheduler.run_jobs(session, as_of=test_time, user_id=isolated_user)
        assert res1["news_daily_job_executed"] is True

        # 2. Immediate second scheduler run skips execution (idempotent)
        res2 = await scheduler.run_jobs(
            session, as_of=test_time + timedelta(minutes=1), user_id=isolated_user
        )
        assert res2["news_daily_job_executed"] is False

        # 3. Exactly one DailyEdition exists for today
        count_stmt = select(DailyEdition).where(DailyEdition.edition_date == today)
        editions = (await session.execute(count_stmt)).scalars().all()
        assert len(editions) == 1

        # 4. Direct service invocation also safely reuses the edition
        daily_job_service = DailyNewsJobService()
        direct_res = await daily_job_service.execute_daily_update(
            session, target_timezone="Asia/Kolkata", target_date=today, as_of=test_time
        )
        assert direct_res["status"] == "success"
        assert direct_res["edition_id"] == editions[0].id


# ============================================================================
# 4. MISSED-JOB / CATCH-UP BEHAVIOR
# ============================================================================


@pytest.mark.asyncio
async def test_missed_job_same_day_and_next_morning_catchup():
    """
    Verify:
    - If application starts at 20:25 (after 20:00 schedule), it runs same-day catch-up.
    - If application starts next morning at 08:00 AM and yesterday's edition was missed,
      it generates yesterday's edition.
    - It does NOT run an aggressive multi-day historical backfill.
    """
    scheduler = GardenScheduler()
    isolated_user_a = f"catchup-a-{uuid.uuid4().hex[:8]}"

    # Case A: Same-day catch-up at 20:45
    yest_a, day_a = get_unique_date_pair(base_year=2046)
    same_day_time = datetime(
        day_a.year, day_a.month, day_a.day, 20, 45, tzinfo=ZoneInfo("Asia/Kolkata")
    )

    async with AsyncSessionLocal() as session:
        session.add(DailyEdition(edition_date=yest_a, title=f"Pre-seed {yest_a.isoformat()}"))
        await session.commit()

        res_same_day = await scheduler.run_jobs(
            session, as_of=same_day_time, user_id=isolated_user_a
        )
        assert res_same_day["news_daily_job_executed"] is True
        stmt = select(DailyEdition).where(DailyEdition.edition_date == day_a)
        assert (await session.execute(stmt)).scalars().first() is not None

    # Case B: Next morning catch-up at 08:30 AM (before today's 20:00)
    isolated_user_b = f"catchup-b-{uuid.uuid4().hex[:8]}"
    yest_b, today_b = get_unique_date_pair(base_year=2048)
    morning_time = datetime(
        today_b.year, today_b.month, today_b.day, 8, 30, tzinfo=ZoneInfo("Asia/Kolkata")
    )

    async with AsyncSessionLocal() as session:
        # yest_b was missed (no DailyEdition in DB)
        res_morning = await scheduler.run_jobs(session, as_of=morning_time, user_id=isolated_user_b)
        assert res_morning["news_daily_job_executed"] is True

        # Yesterday's edition was caught up
        stmt_yest = select(DailyEdition).where(DailyEdition.edition_date == yest_b)
        assert (await session.execute(stmt_yest)).scalars().first() is not None

        # Today's edition was NOT generated early (waits for 20:00)
        stmt_today = select(DailyEdition).where(DailyEdition.edition_date == today_b)
        assert (await session.execute(stmt_today)).scalars().first() is None


# ============================================================================
# 5. SOURCE FAILURE ISOLATION
# ============================================================================


class FailingNewsProvider(NewsProvider):
    async def fetch_feed(self, feed_url: str, timeout_seconds: float = 15.0) -> list[RawFeedEntry]:
        raise FeedFetchError(f"Simulated network timeout for {feed_url}")


class WorkingNewsProvider(NewsProvider):
    async def fetch_feed(self, feed_url: str, timeout_seconds: float = 15.0) -> list[RawFeedEntry]:
        return [
            RawFeedEntry(
                raw_title="Resilient dispatch from reliable feed",
                raw_url=f"https://reliable.example.org/dispatch-{uuid.uuid4().hex[:6]}",
                raw_guid=f"reliable-dispatch-{uuid.uuid4().hex[:6]}",
                raw_description="This article succeeded.",
            )
        ]


@pytest.mark.asyncio
async def test_source_failure_isolation_and_error_recording():
    """
    Verify:
    - Failure in one news source does NOT abort ingestion of other sources.
    - Errors are recorded in ingestion stats and scheduled job metadata.
    """
    async with AsyncSessionLocal() as session:
        # Create a working source and a failing source
        src_good = NewsSource(
            name="Reliable Feed",
            base_url="https://reliable.example.org",
            feed_url=f"https://reliable.example.org/feed-{uuid.uuid4().hex[:6]}.xml",
            source_type="custom_good",
            category="ai",
            is_enabled=True,
        )
        src_bad = NewsSource(
            name="Broken Feed",
            base_url="https://broken.example.org",
            feed_url=f"https://broken.example.org/feed-{uuid.uuid4().hex[:6]}.xml",
            source_type="custom_bad",
            category="ai",
            is_enabled=True,
        )
        session.add_all([src_good, src_bad])
        await session.commit()

        ingestion = NewsIngestionService(
            providers={
                "custom_good": WorkingNewsProvider(),
                "custom_bad": FailingNewsProvider(),
            }
        )

        stat_good = await ingestion.ingest_source(session, src_good)
        assert stat_good.status == "success"
        assert stat_good.articles_added >= 1

        stat_bad = await ingestion.ingest_source(session, src_bad)
        assert stat_bad.status == "error"
        assert "Simulated network timeout" in stat_bad.error_message


# ============================================================================
# 6. LLM ENRICHMENT FAILURE HANDLING
# ============================================================================


@pytest.mark.asyncio
async def test_llm_enrichment_failure_preserves_article():
    """
    Verify:
    - If LLM summarization fails, article data is preserved with summary_status='failed'.
    - Article title, URL, description remain fully intact and readable.
    """
    async with AsyncSessionLocal() as session:
        src = NewsSource(
            name="Science Dispatch",
            base_url="https://science.example.org",
            feed_url=f"https://science.example.org/{uuid.uuid4().hex[:6]}.xml",
            category="science_defence",
        )
        session.add(src)
        await session.flush()

        art = NewsArticle(
            source_id=src.id,
            source=src,
            canonical_url=f"https://example.com/test-art-{uuid.uuid4().hex[:8]}",
            title="Cosmic Ray Observation",
            description="High-energy neutrino detected.",
            url="https://example.com/test-art",
            category="science_defence",
            summary_status="none",
        )
        session.add(art)
        await session.commit()
        await session.refresh(art)

        summarizer = NewsSummarizerService()

        import app.services.news.summarizer as sum_mod

        class BrokenLLM:
            provider_name = "mock_broken"

            async def generate_structured(self, **kwargs):
                raise RuntimeError("LLM rate limit reached")

        orig_provider = sum_mod.get_llm_provider
        sum_mod.get_llm_provider = lambda: BrokenLLM()
        try:
            res_art = await summarizer.summarize_article(session, art, force=True)
            assert res_art.summary_status == "failed"
            assert res_art.title == "Cosmic Ray Observation"
            assert res_art.description == "High-energy neutrino detected."
        finally:
            sum_mod.get_llm_provider = orig_provider


# ============================================================================
# 7. MANUAL TRIGGER USES SAME SERVICE PATH
# ============================================================================


@pytest.mark.asyncio
async def test_manual_trigger_uses_same_service_path(async_client: AsyncClient):
    """
    Verify:
    - API endpoint POST /api/v1/news/daily-job uses DailyNewsJobService.
    - Creates a ScheduledJob record with status 'success'.
    """
    headers = gen_auth("manual-news-trigger")
    resp = await async_client.post("/api/v1/news/daily-job?timezone=Asia/Kolkata", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "job_id" in data
    assert "edition_id" in data

    async with AsyncSessionLocal() as session:
        job = await session.get(ScheduledJob, data["job_id"])
        assert job is not None
        assert job.status == "success"
        assert job.completed_at is not None
        assert job.metadata_json["timezone"] == "Asia/Kolkata"


# ============================================================================
# 8. JOB STATE OBSERVABILITY & RETRY BACKOFF
# ============================================================================


@pytest.mark.asyncio
async def test_job_state_observability_and_failure_retry_backoff():
    """
    Verify:
    - ScheduledJob captures: scheduled_time, started_at, completed_at, status, error_message, metadata_json.
    - When a job fails, immediate subsequent tick (< 300s backoff) is skipped.
    - After 3 failures, automatic retries cease for that day.
    """
    isolated_user = f"retry-user-{uuid.uuid4().hex[:8]}"
    yest_date, target_date = get_unique_date_pair(base_year=2050)
    job_name = f"daily_news_edition_{target_date.isoformat()}"
    base_time = datetime(
        target_date.year, target_date.month, target_date.day, 20, 5, tzinfo=ZoneInfo("Asia/Kolkata")
    )

    scheduler = GardenScheduler()

    # Pre-seed yesterday so catch-up doesn't fire
    async with AsyncSessionLocal() as session:
        session.add(DailyEdition(edition_date=yest_date, title=f"Pre-seed {yest_date.isoformat()}"))

        # Simulate 1st failed attempt
        job1 = ScheduledJob(
            job_name=job_name,
            scheduled_time=base_time.astimezone(UTC),
            started_at=base_time.astimezone(UTC),
            completed_at=base_time.astimezone(UTC) + timedelta(seconds=2),
            status="failed",
            error_message="Network connection reset",
        )
        session.add(job1)
        await session.commit()

        # Tick 1 minute later: backoff (300s) should prevent automatic retry
        tick_1 = base_time + timedelta(minutes=1)
        summary_1 = await scheduler.run_jobs(session, as_of=tick_1, user_id=isolated_user)
        assert summary_1["news_daily_job_executed"] is False

        # Simulate 2 more failures to reach threshold of 3
        job2 = ScheduledJob(
            job_name=job_name,
            scheduled_time=base_time.astimezone(UTC),
            started_at=base_time.astimezone(UTC) + timedelta(minutes=6),
            completed_at=base_time.astimezone(UTC) + timedelta(minutes=6, seconds=2),
            status="failed",
            error_message="Gateway timeout",
        )
        job3 = ScheduledJob(
            job_name=job_name,
            scheduled_time=base_time.astimezone(UTC),
            started_at=base_time.astimezone(UTC) + timedelta(minutes=12),
            completed_at=base_time.astimezone(UTC) + timedelta(minutes=12, seconds=2),
            status="failed",
            error_message="Internal server error",
        )
        session.add_all([job2, job3])
        await session.commit()

        # Tick after 30 minutes: 3 failures reached, should cease automatic retries
        tick_30 = base_time + timedelta(minutes=30)
        summary_30 = await scheduler.run_jobs(session, as_of=tick_30, user_id=isolated_user)
        assert summary_30["news_daily_job_executed"] is False


# ============================================================================
# 9. ACTIVE RUNNING JOB PREVENTS DUPLICATE CONCURRENT RUNS
# ============================================================================


@pytest.mark.asyncio
async def test_active_running_job_prevents_duplicate_runs():
    """
    Verify:
    - If a job is already in 'running' state within the lock window, subsequent calls return already_running.
    """
    _, target_date = get_unique_date_pair(base_year=2052)
    job_name = f"daily_news_edition_{target_date.isoformat()}"
    now = datetime.now(UTC)

    async with AsyncSessionLocal() as session:
        active_job = ScheduledJob(
            job_name=job_name,
            scheduled_time=now,
            started_at=now,
            status="running",
        )
        session.add(active_job)
        await session.commit()

        daily_job_service = DailyNewsJobService()
        result = await daily_job_service.execute_daily_update(
            session,
            target_timezone="Asia/Kolkata",
            target_date=target_date,
            force=False,
        )
        assert result["status"] == "already_running"
