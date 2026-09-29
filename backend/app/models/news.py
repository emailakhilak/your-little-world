import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class NewsSource(Base, TimestampMixin):
    """
    Represents an external news publishing source or feed (RSS/Atom).
    Categorized into one of the four core Faraway Window domains.
    """

    __tablename__ = "news_sources"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    base_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    feed_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
        unique=True,
        index=True,
    )
    # Source type: "rss", "atom", "api"
    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="rss",
    )
    # Category: "ai", "mystery", "science_defence", "developer"
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )
    reliability_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # Relationships
    articles = relationship(
        "NewsArticle",
        back_populates="source",
        cascade="all, delete-orphan",
        order_by="desc(NewsArticle.published_at)",
    )

    __table_args__ = (Index("ix_news_sources_category_enabled", "category", "is_enabled"),)


class NewsArticle(Base, TimestampMixin):
    """
    Represents an ingested, normalized, and deduplicated news article.
    Belongs to a registered NewsSource and is preserved for reading and historical editions.
    """

    __tablename__ = "news_articles"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    source_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("news_sources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # External ID / GUID provided by the source
    external_id: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        index=True,
    )
    # Normalized canonical URL used for primary deterministic deduplication
    canonical_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
        unique=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    url: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    author: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    image_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    raw_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # LLM-assisted summary fields
    summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    key_points: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
    )
    why_it_matters: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    summary_status: Mapped[str] = mapped_column(
        String(50),
        server_default="none",
        nullable=False,
        default="none",
    )
    summary_provider: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # Relationships
    source = relationship("NewsSource", back_populates="articles")

    @property
    def source_name(self) -> str | None:
        return self.source.name if self.source else None

    __table_args__ = (
        Index("ix_news_articles_category_published", "category", "published_at"),
        Index("ix_news_articles_source_published", "source_id", "published_at"),
        Index("ix_news_articles_source_external", "source_id", "external_id"),
    )


class DailyEdition(Base, TimestampMixin):
    """
    Represents a curated daily edition of Faraway Window dispatches for a given date.
    Generated daily at 8 PM Asia/Kolkata or on demand.
    """

    __tablename__ = "daily_editions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    edition_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        unique=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="published",
    )
    lead_summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # Relationships
    edition_articles = relationship(
        "DailyEditionArticle",
        back_populates="edition",
        cascade="all, delete-orphan",
        order_by="DailyEditionArticle.position",
    )


class DailyEditionArticle(Base, TimestampMixin):
    """
    Junction mapping selected articles into a specific daily edition.
    """

    __tablename__ = "daily_edition_articles"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    edition_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("daily_editions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    article_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("news_articles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    # Relationships
    edition = relationship("DailyEdition", back_populates="edition_articles")
    article = relationship("NewsArticle")

    __table_args__ = (
        UniqueConstraint("edition_id", "article_id", name="uq_daily_edition_article"),
        Index("ix_edition_articles_position", "edition_id", "position"),
    )


class UserArticleRead(Base, TimestampMixin):
    """
    Tracks article reading history for an authenticated user.
    """

    __tablename__ = "user_article_reads"

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
    article_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("news_articles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    completed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    article = relationship("NewsArticle")

    __table_args__ = (
        UniqueConstraint("user_id", "article_id", name="uq_user_article_read"),
        Index("ix_user_article_reads_user_read_at", "user_id", "read_at"),
    )
