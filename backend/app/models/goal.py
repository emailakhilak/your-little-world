import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Goal(Base, TimestampMixin):
    """
    Goal entity representing a user's intention, habit, milestone, or aspiration.
    Designed to be extensible for future recurrence, achievements, and progress tracking.
    """

    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    # Category: "seedling", "habit", "milestone", "aspiration"
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="seedling",
    )
    # Status: "active", "completed", "archived"
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        index=True,
    )
    # Visual emblem / seed icon: e.g. "🌱", "🌿", "🌸", "🌻", "🌳", "✨"
    icon: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="🌱",
    )
    # Priority: "low", "normal", "high"
    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="normal",
    )
    # Optional target / deadline date
    target_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    # Lifecycle timestamps
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    # Progress tracking (e.g. 0/1 or numeric progress)
    progress_current: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    progress_target: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    # Extensible cadence for recurring goals (e.g. None, "daily", "weekly", "monthly")
    recurrence_cadence: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    __table_args__ = (
        Index("ix_goals_user_id_status", "user_id", "status"),
        Index("ix_goals_user_id_created_at", "user_id", "created_at"),
    )
