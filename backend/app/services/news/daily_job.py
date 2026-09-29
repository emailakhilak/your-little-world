import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.timezone import get_today_date, now_in_timezone
from app.models.scheduled_job import ScheduledJob
from app.services.news.edition_service import DailyEditionService
from app.services.news.ingestion_service import NewsIngestionService

logger = logging.getLogger("your_little_world.daily_job")


class DailyNewsJobService:
    """
    Orchestrates the 8 PM Asia/Kolkata daily news workflow:
    1. Synchronize sources
    2. Ingest latest feeds with failure isolation
    3. Curate Daily Edition for today (Asia/Kolkata)
    4. Record execution status in scheduled_jobs table
    """

    def __init__(
        self,
        ingestion_service: NewsIngestionService | None = None,
        edition_service: DailyEditionService | None = None,
    ):
        self.ingestion_service = ingestion_service or NewsIngestionService()
        self.edition_service = edition_service or DailyEditionService()

    async def execute_daily_update(
        self,
        db: AsyncSession,
        target_timezone: str = "Asia/Kolkata",
    ) -> dict[str, Any]:
        """
        Executes daily ingestion and edition curation pass with job tracking.
        """
        local_now = now_in_timezone(target_timezone)
        today_date = get_today_date(target_timezone)
        job_name = f"daily_news_edition_{today_date.isoformat()}"

        job_record = ScheduledJob(
            job_name=job_name,
            scheduled_time=local_now.astimezone(UTC),
            started_at=datetime.now(UTC),
            status="running",
            metadata_json={"timezone": target_timezone, "target_date": today_date.isoformat()},
        )
        db.add(job_record)
        await db.commit()
        await db.refresh(job_record)

        try:
            # 1. Sync default sources
            await self.ingestion_service.sync_sources(db)

            # 2. Ingest latest feeds across all categories
            stats = await self.ingestion_service.ingest_all(db)

            # 3. Curate daily edition for today
            edition = await self.edition_service.get_or_create_today_edition(
                db=db,
                target_date=today_date,
                force_regenerate=False,
            )

            # 4. Record success
            job_record.status = "success"
            job_record.completed_at = datetime.now(UTC)
            job_record.metadata_json = {
                "timezone": target_timezone,
                "target_date": today_date.isoformat(),
                "edition_id": edition.id,
                "articles_seen": stats.articles_seen,
                "articles_added": stats.articles_added,
                "sources_processed": stats.sources_processed,
                "errors": stats.errors,
            }
            await db.commit()

            return {
                "job_id": job_record.id,
                "status": "success",
                "edition_id": edition.id,
                "edition_date": today_date.isoformat(),
                "articles_added": stats.articles_added,
                "sources_processed": stats.sources_processed,
            }
        except Exception as e:
            logger.error(f"Daily news update job failed: {e}", exc_info=True)
            job_record.status = "failed"
            job_record.completed_at = datetime.now(UTC)
            job_record.error_message = str(e)
            await db.commit()
            raise
