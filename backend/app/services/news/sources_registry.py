from dataclasses import dataclass
from typing import Any

from app.services.news.categories import NewsCategory


@dataclass(frozen=True)
class PreconfiguredSource:
    """Immutable declaration of a pre-configured public news source."""

    slug: str
    name: str
    base_url: str
    feed_url: str
    source_type: str
    category: NewsCategory
    is_enabled: bool = True
    reliability_metadata: dict[str, Any] | None = None


# Curated, verified, real public feeds across the four Faraway Window domains
INITIAL_SOURCES: list[PreconfiguredSource] = [
    # 1. AI Tools & AI News
    PreconfiguredSource(
        slug="ars-technica-ai",
        name="Ars Technica — Tech Lab",
        base_url="https://arstechnica.com",
        feed_url="https://feeds.arstechnica.com/arstechnica/technology-lab",
        source_type="rss",
        category=NewsCategory.AI,
        reliability_metadata={"tier": "high", "focus": "AI breakthroughs and tech analysis"},
    ),
    PreconfiguredSource(
        slug="simon-willison-ai",
        name="Simon Willison — AI Weblog",
        base_url="https://simonwillison.net",
        feed_url="https://simonwillison.net/tags/ai.atom",
        source_type="atom",
        category=NewsCategory.AI,
        reliability_metadata={"tier": "high", "focus": "LLMs, open weights, and AI tools"},
    ),
    # 2. Detective / Mystery / Investigation
    PreconfiguredSource(
        slug="archaeology-magazine",
        name="Archaeology Magazine",
        base_url="https://archaeology.org",
        feed_url="https://archaeology.org/feed/",
        source_type="rss",
        category=NewsCategory.MYSTERY,
        reliability_metadata={
            "tier": "high",
            "focus": "Ancient enigmas, forensic excavations, discoveries",
        },
    ),
    PreconfiguredSource(
        slug="criminal-element",
        name="Criminal Element",
        base_url="https://www.criminalelement.com",
        feed_url="https://www.criminalelement.com/feed/",
        source_type="rss",
        category=NewsCategory.MYSTERY,
        reliability_metadata={
            "tier": "curated",
            "focus": "Investigative essays and mystery chronicles",
        },
    ),
    # 3. Space / Science / Defence-Tech
    PreconfiguredSource(
        slug="nasa-breaking",
        name="NASA Breaking News",
        base_url="https://www.nasa.gov",
        feed_url="https://www.nasa.gov/news-release/feed/",
        source_type="rss",
        category=NewsCategory.SCIENCE_DEFENCE,
        reliability_metadata={
            "tier": "official",
            "focus": "Aerospace, planetary exploration, deep space",
        },
    ),
    PreconfiguredSource(
        slug="esa-news",
        name="European Space Agency",
        base_url="https://www.esa.int",
        feed_url="https://www.esa.int/rssfeed/Our_Activities/Space_News",
        source_type="rss",
        category=NewsCategory.SCIENCE_DEFENCE,
        reliability_metadata={
            "tier": "official",
            "focus": "Space science, orbital missions, observational astronomy",
        },
    ),
    # 4. Software / Developer News
    PreconfiguredSource(
        slug="hacker-news",
        name="Hacker News",
        base_url="https://news.ycombinator.com",
        feed_url="https://news.ycombinator.com/rss",
        source_type="rss",
        category=NewsCategory.DEVELOPER,
        reliability_metadata={
            "tier": "community",
            "focus": "Computer science, systems, technology",
        },
    ),
    PreconfiguredSource(
        slug="github-blog",
        name="GitHub Engineering & Blog",
        base_url="https://github.blog",
        feed_url="https://github.blog/feed/",
        source_type="rss",
        category=NewsCategory.DEVELOPER,
        reliability_metadata={
            "tier": "official",
            "focus": "Open source, software design, developer tools",
        },
    ),
]
