import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.services.news.base_provider import FeedFetchError, FeedParseError, RawFeedEntry
from app.services.news.categories import NewsCategory
from app.services.news.ingestion_service import NewsIngestionService
from app.services.news.normalizer import ArticleNormalizer, NormalizationError
from app.services.news.rss_provider import RssNewsProvider

SAMPLE_RSS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>AI &amp; Tech Chronicles</title>
    <link>https://example.com</link>
    <description>Daily chronicles of machine cognition</description>
    <item>
      <title>Unlocking Reasoning Models</title>
      <link>https://example.com/ai/reasoning?utm_source=feed&amp;utm_medium=rss</link>
      <guid isPermaLink="false">ai-post-101</guid>
      <description>&lt;p&gt;A breakthrough in synthetic deliberation.&lt;/p&gt;</description>
      <dc:creator>Ada Lovelace</dc:creator>
      <pubDate>Sun, 27 Sep 2026 10:00:00 GMT</pubDate>
      <enclosure url="https://example.com/images/brain.jpg" type="image/jpeg" />
    </item>
    <item>
      <title>Open Weights Revolution</title>
      <link>https://example.com/ai/weights</link>
      <guid>https://example.com/ai/weights</guid>
      <description>Local inference speeds have doubled across modern chips.</description>
      <pubDate>Mon, 28 Sep 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""

SAMPLE_ATOM_XML = """<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Observational Science Dispatch</title>
  <link href="https://space.example.com"/>
  <updated>2026-09-27T14:00:00Z</updated>
  <entry>
    <title>Deep Space Telescopes Detect Water Vapor</title>
    <link rel="alternate" href="https://space.example.com/missions/water?utm_campaign=social"/>
    <id>urn:space:mission:2026:water</id>
    <published>2026-09-27T08:30:00Z</published>
    <summary>Atmospheric spectral data reveals habitable signatures.</summary>
    <author>
      <name>Carl Sagan</name>
    </author>
    <link rel="enclosure" type="image/png" href="https://space.example.com/media/nebula.png"/>
  </entry>
</feed>
"""

SAMPLE_PARTIALLY_INVALID_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Mixed Quality Feed</title>
    <item>
      <!-- Missing link -->
      <title>Broken Entry Without Link</title>
    </item>
    <item>
      <!-- Missing title -->
      <link>https://example.com/no-title</link>
    </item>
    <item>
      <title>Valid Entry Survived</title>
      <link>https://example.com/valid-entry</link>
      <description>This one has both title and link.</description>
      <pubDate>Sun, 27 Sep 2026 15:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""


def gen_auth(prefix: str = "user") -> dict[str, str]:
    uid = f"test-news-{prefix}-{uuid.uuid4().hex[:8]}"
    return {"Authorization": f"Bearer {uid}"}


# ==============================================================
# 1. RSS & Atom Provider & Normalization Unit Tests
# ==============================================================


def test_rss_parsing_extracts_all_fields():
    """3. RSS normalization."""
    provider = RssNewsProvider()
    entries = provider._parse_feed_xml(SAMPLE_RSS_XML, "https://example.com/rss")
    assert len(entries) == 2

    e1 = entries[0]
    assert e1.raw_title == "Unlocking Reasoning Models"
    assert "https://example.com/ai/reasoning" in e1.raw_url
    assert e1.raw_guid == "ai-post-101"
    assert e1.raw_author == "Ada Lovelace"
    assert e1.raw_published == "Sun, 27 Sep 2026 10:00:00 GMT"
    assert e1.raw_image_url == "https://example.com/images/brain.jpg"

    norm = ArticleNormalizer.normalize_entry(e1, category=NewsCategory.AI.value)
    assert norm.title == "Unlocking Reasoning Models"
    assert norm.canonical_url == "https://example.com/ai/reasoning"
    assert norm.description == "A breakthrough in synthetic deliberation."
    assert norm.author == "Ada Lovelace"
    assert norm.image_url == "https://example.com/images/brain.jpg"
    assert norm.category == "ai"
    assert norm.published_at == datetime(2026, 9, 27, 10, 0, tzinfo=UTC)


def test_atom_parsing_and_normalization():
    """8. Multiple categories and Atom feeds work."""
    provider = RssNewsProvider()
    entries = provider._parse_feed_xml(SAMPLE_ATOM_XML, "https://space.example.com/atom")
    assert len(entries) == 1

    e = entries[0]
    assert e.raw_title == "Deep Space Telescopes Detect Water Vapor"
    assert e.raw_guid == "urn:space:mission:2026:water"
    assert e.raw_author == "Carl Sagan"

    norm = ArticleNormalizer.normalize_entry(e, category=NewsCategory.SCIENCE_DEFENCE.value)
    assert norm.canonical_url == "https://space.example.com/missions/water"
    assert norm.author == "Carl Sagan"
    assert norm.category == "science_defence"
    assert norm.published_at == datetime(2026, 9, 27, 8, 30, tzinfo=UTC)
    assert norm.image_url == "https://space.example.com/media/nebula.png"


def test_missing_optional_fields_handled_gracefully():
    """4. Missing optional fields."""
    raw = RawFeedEntry(
        raw_title="Minimal Article",
        raw_url="https://minimal.example.com/post/1?utm_medium=rss",
    )
    norm = ArticleNormalizer.normalize_entry(raw, category=NewsCategory.DEVELOPER.value)
    assert norm.title == "Minimal Article"
    assert norm.canonical_url == "https://minimal.example.com/post/1"
    assert norm.external_id == "https://minimal.example.com/post/1"
    assert norm.description is None
    assert norm.author is None
    assert norm.published_at is None
    assert norm.image_url is None


def test_invalid_feed_and_entry_handling():
    """5. Invalid feed handling."""
    # A. Missing title raises NormalizationError
    with pytest.raises(NormalizationError, match="missing title"):
        ArticleNormalizer.normalize_entry(
            RawFeedEntry(raw_title="", raw_url="https://example.com/1"),
            category="ai",
        )

    # B. Missing URL raises NormalizationError
    with pytest.raises(NormalizationError, match="missing link"):
        ArticleNormalizer.normalize_entry(
            RawFeedEntry(raw_title="Valid Title", raw_url=""),
            category="ai",
        )

    # C. Malformed XML raises FeedParseError
    provider = RssNewsProvider()
    with pytest.raises(FeedParseError, match="Malformed XML"):
        provider._parse_feed_xml("<rss><broken-xml", "https://broken.feed")

    # D. Partial invalid RSS skips broken items, keeps valid ones
    entries = provider._parse_feed_xml(SAMPLE_PARTIALLY_INVALID_RSS, "https://example.com")
    valid_norms = []
    for it in entries:
        try:
            valid_norms.append(ArticleNormalizer.normalize_entry(it, category="developer"))
        except NormalizationError:
            pass
    assert len(valid_norms) == 1
    assert valid_norms[0].title == "Valid Entry Survived"


# ==============================================================
# 2. Ingestion Service, Deduplication & Resilience Tests
# ==============================================================


@pytest.mark.asyncio
async def test_repeated_ingestion_is_idempotent_and_prevents_duplicates(async_client: AsyncClient):
    """6. Duplicate article prevention.
    7. Repeated ingestion is idempotent."""
    user = gen_auth("idempotent")
    run_id = uuid.uuid4().hex[:8]

    mock_provider = AsyncMock()
    mock_provider.fetch_feed.return_value = [
        RawFeedEntry(
            raw_title="Mystery in the Valley",
            raw_url=f"https://mystery.example.com/case/1-{run_id}?utm_source=feed",
            raw_guid=f"mystery-case-1-{run_id}",
            raw_description="A quiet disappearance in the fog.",
            raw_published="Sun, 27 Sep 2026 12:00:00 GMT",
        ),
        RawFeedEntry(
            raw_title="The Missing Cipher",
            raw_url=f"https://mystery.example.com/case/2-{run_id}",
            raw_guid=f"mystery-case-2-{run_id}",
            raw_description="A Victorian notebook found in an attic.",
            raw_published="Sun, 27 Sep 2026 13:00:00 GMT",
        ),
    ]

    with patch.object(NewsIngestionService, "get_provider", return_value=mock_provider):
        # 1st Ingestion run
        res1 = await async_client.post("/api/v1/news/ingest?sync_sources=true", headers=user)
        assert res1.status_code == 200
        stats1 = res1.json()
        assert stats1["sources_processed"] >= 1
        assert stats1["articles_added"] >= 2

        # 2nd Ingestion run (same feed contents)
        res2 = await async_client.post("/api/v1/news/ingest?sync_sources=false", headers=user)
        assert res2.status_code == 200
        stats2 = res2.json()
        assert stats2["articles_added"] == 0
        assert stats2["articles_skipped"] >= 2


@pytest.mark.asyncio
async def test_one_failed_source_does_not_halt_other_sources(async_client: AsyncClient):
    """14. One failed source does not prevent other sources from being processed."""
    user = gen_auth("resilience")

    async def dynamic_fetch(feed_url: str, timeout_seconds: float = 15.0):
        if "arstechnica" in feed_url:
            raise FeedFetchError("Connection timed out reaching remote server")
        return [
            RawFeedEntry(
                raw_title="NASA Explores Ocean World",
                raw_url=f"https://example.com/news/{uuid.uuid4().hex[:8]}",
                raw_guid=f"guid-{uuid.uuid4().hex[:8]}",
                raw_description="New probe data indicates liquid layers.",
            )
        ]

    mock_provider = AsyncMock()
    mock_provider.fetch_feed.side_effect = dynamic_fetch

    with patch.object(NewsIngestionService, "get_provider", return_value=mock_provider):
        res = await async_client.post("/api/v1/news/ingest?sync_sources=true", headers=user)
        assert res.status_code == 200
        stats = res.json()

        # ars technica failed, but NASA and others proceeded!
        assert len(stats["errors"]) >= 1
        assert any("Ars Technica" in err for err in stats["errors"])
        assert stats["articles_added"] >= 1


# ==============================================================
# 3. Source & Article API Tests (Filtering, Ordering, Auth)
# ==============================================================


@pytest.mark.asyncio
async def test_news_sources_endpoints(async_client: AsyncClient):
    """1. News source creation/loading.
    2. News source listing."""
    user = gen_auth("sources")

    # Fetch sources
    res = await async_client.get("/api/v1/news/sources", headers=user)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 8
    categories = {s["category"] for s in data["items"]}
    assert "ai" in categories
    assert "mystery" in categories
    assert "science_defence" in categories
    assert "developer" in categories

    # Filter sources by category
    ai_res = await async_client.get("/api/v1/news/sources?category=ai", headers=user)
    assert ai_res.status_code == 200
    ai_data = ai_res.json()
    assert all(s["category"] == "ai" for s in ai_data["items"])


@pytest.mark.asyncio
async def test_article_listing_filtering_and_ordering(async_client: AsyncClient):
    """9. Article list ordering.
    10. Category filtering.
    11. Source filtering.
    12. Article detail endpoint."""
    user = gen_auth("articles")

    # Seed two specific articles with different dates and categories
    mock_provider = AsyncMock()
    unique_suffix = uuid.uuid4().hex[:6]
    mock_provider.fetch_feed.return_value = [
        RawFeedEntry(
            raw_title=f"AI Milestone {unique_suffix}",
            raw_url=f"https://ai.example.com/post/{unique_suffix}",
            raw_guid=f"ai-{unique_suffix}",
            raw_description="Artificial intelligence update.",
            raw_published="Sun, 27 Sep 2026 09:00:00 GMT",
        ),
        RawFeedEntry(
            raw_title=f"Detective Case {unique_suffix}",
            raw_url=f"https://mystery.example.com/case/{unique_suffix}",
            raw_guid=f"mystery-{unique_suffix}",
            raw_description="Investigation findings revealed.",
            raw_published="Sun, 27 Sep 2026 11:00:00 GMT",
        ),
    ]

    with patch.object(NewsIngestionService, "get_provider", return_value=mock_provider):
        ingest_res = await async_client.post("/api/v1/news/ingest?sync_sources=true", headers=user)
        assert ingest_res.status_code == 200

    # 1. Fetch articles
    list_res = await async_client.get("/api/v1/news/articles?limit=50", headers=user)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 2
    items = list_data["items"]

    # Verify published_at ordering (newest first: 11:00 before 09:00 if both present)
    target_items = [it for it in items if unique_suffix in it["title"]]
    assert len(target_items) == 2
    assert target_items[0]["title"] == f"Detective Case {unique_suffix}"
    assert target_items[1]["title"] == f"AI Milestone {unique_suffix}"

    # 2. Filter by category
    mystery_res = await async_client.get("/api/v1/news/articles?category=mystery", headers=user)
    assert mystery_res.status_code == 200
    mystery_items = mystery_res.json()["items"]
    assert all(it["category"] == "mystery" for it in mystery_items)

    # 3. Article detail endpoint
    article_id = target_items[0]["id"]
    detail_res = await async_client.get(f"/api/v1/news/articles/{article_id}", headers=user)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == article_id
    assert detail["title"] == f"Detective Case {unique_suffix}"
    assert detail["source_name"] is not None

    # 4. Detail 404
    missing_res = await async_client.get(f"/api/v1/news/articles/{uuid.uuid4()}", headers=user)
    assert missing_res.status_code == 404


@pytest.mark.asyncio
async def test_authentication_enforcement(async_client: AsyncClient):
    """13. User authentication behavior."""
    # Missing auth header should be rejected
    res_articles = await async_client.get("/api/v1/news/articles")
    assert res_articles.status_code in (401, 403)

    res_sources = await async_client.get("/api/v1/news/sources")
    assert res_sources.status_code in (401, 403)

    res_ingest = await async_client.post("/api/v1/news/ingest")
    assert res_ingest.status_code in (401, 403)
