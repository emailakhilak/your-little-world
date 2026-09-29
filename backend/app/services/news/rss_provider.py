import asyncio
import logging
import xml.etree.ElementTree as ET

import httpx

from app.services.news.base_provider import (
    FeedFetchError,
    FeedParseError,
    NewsProvider,
    RawFeedEntry,
)

logger = logging.getLogger(__name__)

USER_AGENT = (
    "YourLittleWorld/1.0 (FarawayWindow News Ingestion; privacy-respecting personal news reader)"
)


def _local_tag(element: ET.Element) -> str:
    """Return local tag name stripping any XML namespace."""
    tag = element.tag
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def _find_child_by_local_tag(element: ET.Element, name: str) -> ET.Element | None:
    """Find the first direct child matching local tag name."""
    name_lower = name.lower()
    for child in element:
        if _local_tag(child).lower() == name_lower:
            return child
    return None


def _find_first_child(element: ET.Element, *names: str) -> ET.Element | None:
    """Find the first direct child matching any of the candidate local tag names."""
    for name in names:
        child = _find_child_by_local_tag(element, name)
        if child is not None:
            return child
    return None


def _find_all_by_local_tag(element: ET.Element, name: str) -> list[ET.Element]:
    """Find all direct children matching local tag name."""
    name_lower = name.lower()
    return [child for child in element if _local_tag(child).lower() == name_lower]


class RssNewsProvider(NewsProvider):
    """
    Standard RSS 2.0 / 0.9x / Atom 1.0 feed provider.
    Fetches raw XML content over HTTP and extracts raw entry fields without touching the DB.
    """

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._external_client = client

    async def fetch_feed(
        self,
        feed_url: str,
        timeout_seconds: float = 15.0,
    ) -> list[RawFeedEntry]:
        """Fetch remote feed and return a list of raw entries."""
        xml_content = await self._fetch_feed_content(feed_url, timeout_seconds)
        return self._parse_feed_xml(xml_content, feed_url)

    async def _fetch_feed_content(self, feed_url: str, timeout_seconds: float) -> str:
        """Execute HTTP request with appropriate timeouts, headers, and bounded retry."""
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        }
        max_attempts = 2
        for attempt in range(1, max_attempts + 1):
            try:
                if self._external_client:
                    response = await self._external_client.get(
                        feed_url,
                        headers=headers,
                        timeout=timeout_seconds,
                        follow_redirects=True,
                    )
                else:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            feed_url,
                            headers=headers,
                            timeout=timeout_seconds,
                            follow_redirects=True,
                        )
                response.raise_for_status()
                return response.text
            except httpx.HTTPStatusError as exc:
                # 4xx client errors should NOT be retried
                if 400 <= exc.response.status_code < 500:
                    logger.warning(
                        f"HTTP {exc.response.status_code} client error fetching feed {feed_url}: {exc}"
                    )
                    raise FeedFetchError(
                        f"HTTP {exc.response.status_code} fetching feed {feed_url}: {exc}"
                    ) from exc
                # 5xx server errors can be retried if attempts remain
                if attempt == max_attempts:
                    logger.warning(
                        f"HTTP {exc.response.status_code} error fetching feed {feed_url} after {max_attempts} attempts: {exc}"
                    )
                    raise FeedFetchError(f"HTTP error fetching feed {feed_url}: {exc}") from exc
                await asyncio.sleep(0.1)
            except (httpx.TimeoutException, httpx.RequestError) as exc:
                if attempt == max_attempts:
                    logger.warning(
                        f"Network error fetching feed {feed_url} after {max_attempts} attempts: {exc}"
                    )
                    raise FeedFetchError(f"Failed to fetch feed {feed_url}: {exc}") from exc
                await asyncio.sleep(0.1)
            except Exception as exc:
                logger.error(f"Unexpected error fetching feed {feed_url}: {exc}")
                raise FeedFetchError(f"Failed to fetch feed {feed_url}: {exc}") from exc
        raise FeedFetchError(f"Failed to fetch feed {feed_url} after {max_attempts} attempts")

    def _parse_feed_xml(self, xml_text: str, feed_url: str) -> list[RawFeedEntry]:
        """Parse raw XML into list of RawFeedEntry objects."""
        if not xml_text or not xml_text.strip():
            raise FeedParseError(f"Empty payload received from {feed_url}")

        try:
            root = ET.fromstring(xml_text.strip())
        except ET.ParseError as exc:
            logger.warning(f"XML parse error for {feed_url}: {exc}")
            raise FeedParseError(f"Malformed XML for feed {feed_url}: {exc}") from exc

        root_tag = _local_tag(root).lower()

        # Check for Atom (<feed>)
        if root_tag == "feed":
            return self._parse_atom_feed(root)

        # Check for RSS (<rss> or <rdf>)
        if root_tag in ("rss", "rdf"):
            channel = _find_child_by_local_tag(root, "channel")
            if channel is not None:
                return self._parse_rss_channel(channel)
            # Some RDF feeds put items directly under root
            items = _find_all_by_local_tag(root, "item")
            if items:
                return [self._parse_rss_item(it) for it in items]

        # Check if root itself is a channel
        if root_tag == "channel":
            return self._parse_rss_channel(root)

        raise FeedParseError(f"Unrecognized feed format (root tag: '{root_tag}') for {feed_url}")

    def _parse_rss_channel(self, channel: ET.Element) -> list[RawFeedEntry]:
        """Parse items in an RSS channel."""
        entries: list[RawFeedEntry] = []
        for item in _find_all_by_local_tag(channel, "item"):
            try:
                entry = self._parse_rss_item(item)
                entries.append(entry)
            except Exception as exc:
                logger.debug(f"Skipping malformed RSS item: {exc}")
        return entries

    def _parse_rss_item(self, item: ET.Element) -> RawFeedEntry:
        """Extract fields from a single RSS <item>."""
        title_elem = _find_child_by_local_tag(item, "title")
        title = title_elem.text if title_elem is not None else None

        link_elem = _find_child_by_local_tag(item, "link")
        link = link_elem.text.strip() if (link_elem is not None and link_elem.text) else None

        guid_elem = _find_child_by_local_tag(item, "guid")
        guid = guid_elem.text.strip() if (guid_elem is not None and guid_elem.text) else None

        # Description / Content
        desc_elem = _find_child_by_local_tag(item, "description")
        desc = desc_elem.text if desc_elem is not None else None

        content_elem = _find_child_by_local_tag(item, "encoded")
        content = content_elem.text if content_elem is not None else None

        # Author / Creator
        author_elem = _find_first_child(item, "creator", "author")
        author = (
            author_elem.text.strip() if (author_elem is not None and author_elem.text) else None
        )

        # Publication date
        pubdate_elem = _find_first_child(item, "pubdate", "date")
        pubdate = (
            pubdate_elem.text.strip() if (pubdate_elem is not None and pubdate_elem.text) else None
        )

        # Image extraction (enclosure, media:content, media:thumbnail)
        image_url = None
        for enc in _find_all_by_local_tag(item, "enclosure"):
            enc_type = enc.get("type", "")
            enc_url = enc.get("url")
            if enc_url and (
                enc_type.startswith("image/")
                or enc_url.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
            ):
                image_url = enc_url
                break

        if not image_url:
            for media in _find_all_by_local_tag(item, "content"):
                m_url = media.get("url")
                m_medium = media.get("medium")
                if m_url and (
                    m_medium == "image"
                    or m_url.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
                ):
                    image_url = m_url
                    break

        if not image_url:
            thumb = _find_child_by_local_tag(item, "thumbnail")
            if thumb is not None and thumb.get("url"):
                image_url = thumb.get("url")

        return RawFeedEntry(
            raw_title=title,
            raw_url=link,
            raw_guid=guid,
            raw_description=desc,
            raw_content=content,
            raw_author=author,
            raw_published=pubdate,
            raw_image_url=image_url,
        )

    def _parse_atom_feed(self, feed: ET.Element) -> list[RawFeedEntry]:
        """Parse entries in an Atom <feed>."""
        entries: list[RawFeedEntry] = []
        for entry in _find_all_by_local_tag(feed, "entry"):
            try:
                raw_entry = self._parse_atom_entry(entry)
                entries.append(raw_entry)
            except Exception as exc:
                logger.debug(f"Skipping malformed Atom entry: {exc}")
        return entries

    def _parse_atom_entry(self, entry: ET.Element) -> RawFeedEntry:
        """Extract fields from a single Atom <entry>."""
        title_elem = _find_child_by_local_tag(entry, "title")
        title = title_elem.text if title_elem is not None else None

        # Link resolution: look for rel="alternate" or first link with href
        link = None
        image_url = None
        for link_elem in _find_all_by_local_tag(entry, "link"):
            rel = link_elem.get("rel", "alternate")
            href = link_elem.get("href")
            type_attr = link_elem.get("type", "")

            if rel == "alternate" and href and not link:
                link = href
            elif rel == "enclosure" and href and type_attr.startswith("image/"):
                image_url = href
            elif not link and href and rel != "self":
                link = href

        id_elem = _find_child_by_local_tag(entry, "id")
        guid = id_elem.text.strip() if (id_elem is not None and id_elem.text) else None

        summary_elem = _find_child_by_local_tag(entry, "summary")
        summary = summary_elem.text if summary_elem is not None else None

        content_elem = _find_child_by_local_tag(entry, "content")
        content = content_elem.text if content_elem is not None else None

        # Author name
        author = None
        author_elem = _find_child_by_local_tag(entry, "author")
        if author_elem is not None:
            name_elem = _find_child_by_local_tag(author_elem, "name")
            if name_elem is not None and name_elem.text:
                author = name_elem.text.strip()

        pub_elem = _find_child_by_local_tag(entry, "published")
        published = pub_elem.text.strip() if (pub_elem is not None and pub_elem.text) else None

        upd_elem = _find_child_by_local_tag(entry, "updated")
        updated = upd_elem.text.strip() if (upd_elem is not None and upd_elem.text) else None

        return RawFeedEntry(
            raw_title=title,
            raw_url=link,
            raw_guid=guid,
            raw_description=summary,
            raw_content=content,
            raw_author=author,
            raw_published=published,
            raw_updated=updated,
            raw_image_url=image_url,
        )
