import html
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from app.services.news.base_provider import RawFeedEntry

# Tracking parameters commonly appended to feed links
TRACKING_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "ref",
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "si",
}

# Regex to strip HTML tags for clean description snippets
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
WHITESPACE_PATTERN = re.compile(r"\s+")


class NormalizationError(Exception):
    """Raised when an entry lacks mandatory fields (e.g. title or URL)."""


@dataclass
class NormalizedArticle:
    """Standardized representation of an article ready for deduplication and persistence."""

    title: str
    url: str
    canonical_url: str
    category: str
    external_id: str | None = None
    description: str | None = None
    author: str | None = None
    published_at: datetime | None = None
    image_url: str | None = None
    raw_metadata: dict[str, Any] = field(default_factory=dict)


class ArticleNormalizer:
    """Responsible for turning raw provider feed entries into pristine NormalizedArticles."""

    @staticmethod
    def strip_html_and_unescape(text: str | None, max_len: int = 1500) -> str | None:
        """Strip HTML tags, unescape HTML entities, and collapse whitespace."""
        if not text:
            return None

        # Replace non-breaking spaces before tag removal
        text = text.replace("&nbsp;", " ")
        cleaned = HTML_TAG_PATTERN.sub(" ", text)
        cleaned = html.unescape(cleaned)
        cleaned = WHITESPACE_PATTERN.sub(" ", cleaned).strip()

        if not cleaned:
            return None

        if len(cleaned) > max_len:
            # Truncate at last word boundary
            truncated = cleaned[:max_len]
            last_space = truncated.rfind(" ")
            if last_space > max_len // 2:
                truncated = truncated[:last_space]
            return truncated + "…"

        return cleaned

    @staticmethod
    def normalize_url(raw_url: str) -> tuple[str, str]:
        """
        Normalize a raw URL and generate a deterministic canonical URL.
        Returns: (cleaned_url, canonical_url)
        """
        raw_url = raw_url.strip()
        parsed = urlparse(raw_url)

        if not parsed.scheme or not parsed.netloc:
            raise NormalizationError(f"Malformed URL without scheme or host: '{raw_url}'")

        # Lowercase scheme and netloc
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()

        # Clean tracking query parameters for canonical URL
        filtered_query = [
            (k, v)
            for k, v in parse_qsl(parsed.query, keep_blank_values=False)
            if k.lower() not in TRACKING_PARAMS
        ]
        # Sort query params deterministically
        filtered_query.sort(key=lambda x: x[0])
        canonical_query = urlencode(filtered_query)

        # Normalize trailing slash in path (keep root "/" or strip trailing "/" from non-root paths)
        path = parsed.path
        if path and len(path) > 1 and path.endswith("/"):
            path = path[:-1]
        elif not path:
            path = "/"

        canonical_url = urlunparse(
            (
                scheme,
                netloc,
                path,
                "",  # params
                canonical_query,
                "",  # fragment stripped
            )
        )

        cleaned_url = urlunparse(
            (
                scheme,
                netloc,
                parsed.path or "/",
                parsed.params,
                parsed.query,
                parsed.fragment,
            )
        )

        return cleaned_url, canonical_url

    @staticmethod
    def parse_datetime(raw_date_str: str | None) -> datetime | None:
        """Parse RFC 2822 or ISO 8601 timestamps into timezone-aware UTC datetime."""
        if not raw_date_str:
            return None

        clean_str = raw_date_str.strip()
        if not clean_str:
            return None

        # 1. Try RFC 2822 / 822 (common in RSS)
        try:
            dt = parsedate_to_datetime(clean_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            return dt.astimezone(UTC)
        except Exception:
            pass

        # 2. Try ISO 8601 (common in Atom)
        try:
            # Handle trailing 'Z'
            if clean_str.endswith("Z"):
                clean_str = clean_str[:-1] + "+00:00"
            dt = datetime.fromisoformat(clean_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            return dt.astimezone(UTC)
        except Exception:
            pass

        return None

    @classmethod
    def normalize_entry(
        cls,
        entry: RawFeedEntry,
        category: str,
    ) -> NormalizedArticle:
        """
        Normalize a single RawFeedEntry into a NormalizedArticle.
        Raises NormalizationError if mandatory attributes are missing.
        """
        # Validate title
        if not entry.raw_title or not entry.raw_title.strip():
            raise NormalizationError("Feed entry missing title")
        title = html.unescape(entry.raw_title.strip())

        # Validate URL
        if not entry.raw_url or not entry.raw_url.strip():
            raise NormalizationError("Feed entry missing link/URL")
        cleaned_url, canonical_url = cls.normalize_url(entry.raw_url)

        # External ID / GUID
        external_id = entry.raw_guid.strip() if entry.raw_guid and entry.raw_guid.strip() else None
        if not external_id:
            external_id = canonical_url

        # Description / Content
        desc_candidate = entry.raw_description or entry.raw_content
        description = cls.strip_html_and_unescape(desc_candidate)

        # Author
        author = cls.strip_html_and_unescape(entry.raw_author, max_len=200)

        # Published date (prefer published, fallback to updated)
        published_at = cls.parse_datetime(entry.raw_published) or cls.parse_datetime(
            entry.raw_updated
        )

        # Image URL
        image_url = None
        if entry.raw_image_url and entry.raw_image_url.strip():
            img_candidate = entry.raw_image_url.strip()
            parsed_img = urlparse(img_candidate)
            if parsed_img.scheme in ("http", "https") and parsed_img.netloc:
                image_url = img_candidate

        return NormalizedArticle(
            title=title,
            url=cleaned_url,
            canonical_url=canonical_url,
            category=category,
            external_id=external_id,
            description=description,
            author=author,
            published_at=published_at,
            image_url=image_url,
            raw_metadata=entry.raw_metadata,
        )
