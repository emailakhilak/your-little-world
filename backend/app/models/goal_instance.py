import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class GoalInstance(Base, TimestampMixin):
    """
    Represents a specific scheduled occurrence of a recurring goal.
    Belongs to the authenticated user and prevents duplicate periods via unique constraint.
    """

    __tablename__ = "goal_instances"

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
    # Idempotent period identifier e.g. '2026-09-27', '2026-W39', '2026-09'
    period_key: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    # The calendar date this instance is scheduled for
    scheduled_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    # Status: 'active', 'completed', 'skipped'
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        index=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    goal = relationship("Goal", backref="instances")

    __table_args__ = (
        UniqueConstraint("goal_id", "period_key", name="uq_goal_instance_goal_period"),
        Index("ix_goal_instances_user_scheduled", "user_id", "scheduled_date"),
        Index("ix_goal_instances_goal_status", "goal_id", "status"),
    )
