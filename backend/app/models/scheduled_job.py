import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ScheduledJob(Base, TimestampMixin):
    """
    Tracks background scheduled jobs (e.g. 8 PM news edition generation, reminder dispatcher)
    for observability, idempotency, and preventing overlapping runs.
    """

    __tablename__ = "scheduled_jobs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    job_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    scheduled_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="running",
    )  # "running", "success", "failed"
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    __table_args__ = (
        Index("ix_scheduled_jobs_name_time", "job_name", "scheduled_time"),
        Index("ix_scheduled_jobs_status", "status"),
    )
