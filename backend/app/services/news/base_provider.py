from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class RawFeedEntry:
    """Raw, un-normalized item/entry data extracted from an external provider/feed."""

    raw_title: str | None = None
    raw_url: str | None = None
    raw_guid: str | None = None
    raw_description: str | None = None
    raw_content: str | None = None
    raw_author: str | None = None
    raw_published: str | None = None
    raw_updated: str | None = None
    raw_image_url: str | None = None
    raw_metadata: dict[str, Any] = field(default_factory=dict)


class NewsProviderError(Exception):
    """Base exception for news provider retrieval and transport failures."""


class FeedFetchError(NewsProviderError):
    """Raised when an external feed cannot be reached or returns an HTTP error."""


class FeedParseError(NewsProviderError):
    """Raised when external feed content cannot be parsed as valid XML/feed."""


class NewsProvider(ABC):
    """
    Abstract interface for external news content providers (RSS, Atom, REST APIs).
    Responsible solely for retrieving and parsing raw data from an external source.
    """

    @abstractmethod
    async def fetch_feed(
        self,
        feed_url: str,
        timeout_seconds: float = 15.0,
    ) -> list[RawFeedEntry]:
        """
        Fetch entries from an external feed or API endpoint.

        Raises:
            FeedFetchError: If the remote server times out, fails DNS, or returns an HTTP error.
            FeedParseError: If the remote payload is unparseable or completely malformed.
        """
        pass
