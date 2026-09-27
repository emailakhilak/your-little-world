import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Reminder(Base, TimestampMixin):
    """
    Represents a notification reminder configured for a goal.
    Supports extensible notification channels and timezone-aware triggering.
    """

    __tablename__ = "reminders"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    goal_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("goals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        index=True,
    )
    # Time of day in 24-hr format (e.g. '09:00')
    reminder_time: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="09:00",
    )
    # Timezone of reminder
    timezone: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Asia/Kolkata",
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )
    # Extensible notification channel: 'log', 'in_app', 'email', 'push'
    channel: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="log",
    )
    # Tracking to prevent duplicate notifications
    last_triggered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_period_key: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # Relationships
    goal = relationship("Goal", backref="reminders")

    __table_args__ = (
        Index("ix_reminders_user_goal", "user_id", "goal_id"),
        Index("ix_reminders_due_check", "is_enabled", "timezone"),
    )
