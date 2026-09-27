import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Achievement(Base, TimestampMixin):
    """
    Achievement entity representing a persistent, reflective milestone earned by the user.
    Preserves meaningful accomplishments over time, independent of goal archival or deletion.
    """

    __tablename__ = "achievements"

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
    # Unique deterministic milestone identifier for idempotency (e.g. 'first_goal', 'completed_5_goals')
    milestone_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    # Category: "milestone", "goal", "recurring", "progress", "personal"
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="milestone",
    )
    # Whimsical / botanical emblem: e.g. "🌱", "🌿", "🌸", "🌳", "🌙", "✨"
    icon: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="🌱",
    )
    # Optional source reference (e.g. "goal", "goal_instance", "system")
    source_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    # Unconstrained source ID so the achievement outlives its originating record
    source_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )
    # Flexible structured metadata
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata",
        JSON,
        nullable=True,
    )
    # The moment the achievement was awarded
    achieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "milestone_key", name="uq_achievement_user_milestone"),
        Index("ix_achievements_user_achieved_at", "user_id", "achieved_at"),
        Index("ix_achievements_user_category", "user_id", "category"),
    )
