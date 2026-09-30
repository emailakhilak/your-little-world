import uuid
from datetime import date
from unittest.mock import patch

import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel

from app.ai.base import LLMProvider
from app.ai.exceptions import (
    LLMAPIError,
    LLMAuthenticationError,
    LLMConfigurationError,
    LLMFormatError,
    LLMRateLimitError,
    LLMTimeoutError,
)
from app.ai.factory import get_llm_provider
from app.ai.gemini_provider import GeminiLLMProvider
from app.ai.mock_provider import MockLLMProvider
from app.ai.openai_provider import OpenAILLMProvider
from app.core.config import Settings
from app.core.database import AsyncSessionLocal
from app.main import app
from app.models.news import NewsArticle, NewsSource
from app.schemas.diary import DiaryEntryCreateInput
from app.schemas.llm import DiaryReflectionSchema, NewsSummarySchema, NoteCategorizationSchema
from app.schemas.note import NoteCreateInput
from app.services.diary_service import DiaryService
from app.services.news.edition_service import DailyEditionService
from app.services.news.summarizer import NewsSummarizerService
from app.services.note_service import NoteService


# Helper schema for isolated provider testing
class SampleStructuredSchema(BaseModel):
    title: str
    score: float


# ============================================================================
# 1. MOCK PROVIDER CONFIGURATION
# ============================================================================


def test_mock_provider_configuration_works():
    """Verify mock provider is properly configured and requires no external API keys."""
    cfg = Settings(LLM_PROVIDER="mock")
    assert cfg.LLM_PROVIDER == "mock"
    assert cfg.GEMINI_API_KEY == ""
    assert cfg.OPENAI_API_KEY == ""

    with patch("app.ai.factory.settings.LLM_PROVIDER", "mock"):
        provider = get_llm_provider()
        assert isinstance(provider, MockLLMProvider)
        assert provider.provider_name == "mock"


# ============================================================================
# 2. GEMINI CONFIGURATION VALIDATION
# ============================================================================


def test_gemini_configuration_requires_api_key():
    """Verify Gemini provider configuration fails clearly when GEMINI_API_KEY is missing."""
    # Settings validation
    with pytest.raises(ValueError, match="GEMINI_API_KEY is required"):
        Settings(LLM_PROVIDER="gemini", GEMINI_API_KEY="")

    # Factory validation
    with (
        patch("app.ai.factory.settings.LLM_PROVIDER", "gemini"),
        patch("app.ai.factory.settings.GEMINI_API_KEY", ""),
    ):
        with pytest.raises(LLMConfigurationError, match="GEMINI_API_KEY is required"):
            get_llm_provider()


# ============================================================================
# 3. OPENAI CONFIGURATION VALIDATION
# ============================================================================


def test_openai_configuration_requires_api_key():
    """Verify OpenAI provider configuration fails clearly when OPENAI_API_KEY is missing."""
    # Settings validation
    with pytest.raises(ValueError, match="OPENAI_API_KEY is required"):
        Settings(LLM_PROVIDER="openai", OPENAI_API_KEY="")

    # Factory validation
    with (
        patch("app.ai.factory.settings.LLM_PROVIDER", "openai"),
        patch("app.ai.factory.settings.OPENAI_API_KEY", ""),
    ):
        with pytest.raises(LLMConfigurationError, match="OPENAI_API_KEY is required"):
            get_llm_provider()


# ============================================================================
# 4. PROVIDER FACTORY SELECTION
# ============================================================================


def test_provider_factory_selects_configured_provider():
    """Verify factory returns appropriate provider instance for each valid setting."""
    with patch("app.ai.factory.settings.LLM_PROVIDER", "mock"):
        prov = get_llm_provider()
        assert isinstance(prov, MockLLMProvider)

    with (
        patch("app.ai.factory.settings.LLM_PROVIDER", "gemini"),
        patch("app.ai.factory.settings.GEMINI_API_KEY", "test-gemini-key"),
        patch("app.ai.factory.settings.GEMINI_MODEL", "gemini-2.0-flash"),
    ):
        prov = get_llm_provider()
        assert isinstance(prov, GeminiLLMProvider)
        assert prov.model == "gemini-2.0-flash"
        assert prov.provider_name == "gemini"

    with (
        patch("app.ai.factory.settings.LLM_PROVIDER", "openai"),
        patch("app.ai.factory.settings.OPENAI_API_KEY", "test-openai-key"),
        patch("app.ai.factory.settings.OPENAI_MODEL", "gpt-4o"),
    ):
        prov = get_llm_provider()
        assert isinstance(prov, OpenAILLMProvider)
        assert prov.model == "gpt-4o"
        assert prov.provider_name == "openai"

    with patch("app.ai.factory.settings.LLM_PROVIDER", "none"):
        assert get_llm_provider() is None


# ============================================================================
# 5. UNKNOWN PROVIDER HANDLING
# ============================================================================


def test_unknown_provider_fails_clearly():
    """Verify unknown provider configuration raises clear, descriptive errors."""
    with pytest.raises(ValueError, match="Unknown LLM_PROVIDER"):
        Settings(LLM_PROVIDER="cohere")

    with patch("app.ai.factory.settings.LLM_PROVIDER", "cohere"):
        with pytest.raises(LLMConfigurationError, match="Unknown LLM provider"):
            get_llm_provider()


# ============================================================================
# 6. SECRET ISOLATION & ZERO KEY EXPOSURE
# ============================================================================


@pytest.mark.asyncio
async def test_credentials_never_exposed_via_repr_or_endpoints():
    """Verify API keys are never exposed in provider string representations or API endpoints."""
    gemini_key = "AIzaSySecretGeminiKey1234567890"
    openai_key = "sk-proj-SecretOpenAIKey9876543210"

    gemini_prov = GeminiLLMProvider(api_key=gemini_key, model="gemini-1.5-flash")
    openai_prov = OpenAILLMProvider(api_key=openai_key, model="gpt-4o-mini")

    # Repr must not contain API key
    assert gemini_key not in repr(gemini_prov)
    assert gemini_key not in str(gemini_prov)
    assert openai_key not in repr(openai_prov)
    assert openai_key not in str(openai_prov)

    # API endpoints must never return configured API keys
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": "Bearer dev-user"}

        resp_root = await client.get("/")
        assert gemini_key not in resp_root.text
        assert openai_key not in resp_root.text

        resp_health = await client.get("/api/v1/health")
        assert gemini_key not in resp_health.text
        assert openai_key not in resp_health.text

        resp_articles = await client.get("/api/v1/news/articles?limit=5", headers=headers)
        assert gemini_key not in resp_articles.text
        assert openai_key not in resp_articles.text


# ============================================================================
# 7. PROVIDER TIMEOUT HANDLING
# ============================================================================


@pytest.mark.asyncio
async def test_provider_timeout_is_handled():
    """Verify HTTP client timeout raises LLMTimeoutError without leaking internals."""
    gemini_prov = GeminiLLMProvider(api_key="mock-key", timeout=1.0)
    openai_prov = OpenAILLMProvider(api_key="mock-key", timeout=1.0)

    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Read timeout")):
        with pytest.raises(LLMTimeoutError, match="timed out"):
            await gemini_prov.generate_text("test prompt")

        with pytest.raises(LLMTimeoutError, match="timed out"):
            await gemini_prov.generate_structured("test prompt", SampleStructuredSchema)

        with pytest.raises(LLMTimeoutError, match="timed out"):
            await openai_prov.generate_text("test prompt")

        with pytest.raises(LLMTimeoutError, match="timed out"):
            await openai_prov.generate_structured("test prompt", SampleStructuredSchema)


# ============================================================================
# 8. PROVIDER HTTP / API FAILURE HANDLING
# ============================================================================


@pytest.mark.asyncio
async def test_provider_http_failures_are_handled():
    """Verify HTTP error status codes (401, 429, 500) map to domain exceptions."""
    gemini_prov = GeminiLLMProvider(api_key="mock-key")
    openai_prov = OpenAILLMProvider(api_key="mock-key")

    req = httpx.Request("POST", "http://test")

    # 401 Authentication Error
    resp_401 = httpx.Response(status_code=401, request=req)
    with patch("httpx.AsyncClient.post", return_value=resp_401):
        with pytest.raises(LLMAuthenticationError):
            await gemini_prov.generate_text("test")

        with pytest.raises(LLMAuthenticationError):
            await openai_prov.generate_text("test")

    # 429 Rate Limit Error
    resp_429 = httpx.Response(status_code=429, request=req)
    with patch("httpx.AsyncClient.post", return_value=resp_429):
        with pytest.raises(LLMRateLimitError):
            await gemini_prov.generate_structured("test", SampleStructuredSchema)

        with pytest.raises(LLMRateLimitError):
            await openai_prov.generate_structured("test", SampleStructuredSchema)

    # 500 Server Error
    resp_500 = httpx.Response(status_code=500, request=req)
    with patch("httpx.AsyncClient.post", return_value=resp_500):
        with pytest.raises(LLMAPIError):
            await gemini_prov.generate_text("test")

        with pytest.raises(LLMAPIError):
            await openai_prov.generate_text("test")


# ============================================================================
# 9. MALFORMED STRUCTURED AI OUTPUT HANDLING
# ============================================================================


@pytest.mark.asyncio
async def test_malformed_structured_output_is_handled():
    """Verify non-JSON and invalid schema outputs are safely mapped to LLMFormatError."""
    gemini_prov = GeminiLLMProvider(api_key="mock-key")
    openai_prov = OpenAILLMProvider(api_key="mock-key")

    req = httpx.Request("POST", "http://test")

    # Case A: Corrupted non-JSON string
    gemini_bad_json = httpx.Response(
        status_code=200,
        request=req,
        json={"candidates": [{"content": {"parts": [{"text": "Not valid json at all!"}]}}]},
    )
    with patch("httpx.AsyncClient.post", return_value=gemini_bad_json):
        with pytest.raises(LLMFormatError, match="not valid JSON"):
            await gemini_prov.generate_structured("test", SampleStructuredSchema)

    openai_bad_json = httpx.Response(
        status_code=200,
        request=req,
        json={"choices": [{"message": {"content": "This is raw unformatted text."}}]},
    )
    with patch("httpx.AsyncClient.post", return_value=openai_bad_json):
        with pytest.raises(LLMFormatError, match="not valid JSON"):
            await openai_prov.generate_structured("test", SampleStructuredSchema)

    # Case B: Valid JSON but missing required schema fields
    gemini_bad_schema = httpx.Response(
        status_code=200,
        request=req,
        json={"candidates": [{"content": {"parts": [{"text": '{"unexpected_key": 123}'}]}}]},
    )
    with patch("httpx.AsyncClient.post", return_value=gemini_bad_schema):
        with pytest.raises(LLMFormatError, match="failed schema validation"):
            await gemini_prov.generate_structured("test", SampleStructuredSchema)

    # Case C: Valid JSON wrapped in markdown code fence (should succeed smoothly)
    gemini_markdown_fence = httpx.Response(
        status_code=200,
        request=req,
        json={
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": '```json\n{"title": "Clean Dispatch", "score": 9.5}\n```'}
                        ]
                    }
                }
            ]
        },
    )
    with patch("httpx.AsyncClient.post", return_value=gemini_markdown_fence):
        parsed = await gemini_prov.generate_structured("test", SampleStructuredSchema)
        assert parsed.title == "Clean Dispatch"
        assert parsed.score == 9.5


# ============================================================================
# 10. NEWS ARTICLE USABLE WHEN AI ENRICHMENT FAILS
# ============================================================================


@pytest.mark.asyncio
async def test_news_article_remains_usable_when_ai_fails():
    """Verify failed AI summarization preserves original article attributes and sets summary_status='failed'."""
    summarizer = NewsSummarizerService()

    class FailingLLM(LLMProvider):
        provider_name = "failing_llm"

        async def generate_text(self, *args, **kwargs):
            raise LLMTimeoutError("Model timed out")

        async def generate_structured(self, *args, **kwargs):
            raise LLMRateLimitError("Quota limit hit")

    async with AsyncSessionLocal() as session:
        src = NewsSource(
            name="Reliable Tech News",
            base_url="https://tech.example.com",
            feed_url=f"https://tech.example.com/{uuid.uuid4().hex[:6]}.xml",
            category="developer",
        )
        session.add(src)
        await session.flush()

        art = NewsArticle(
            source_id=src.id,
            source=src,
            canonical_url=f"https://example.com/item-{uuid.uuid4().hex[:8]}",
            title="Pivotal Rust Release",
            description="New type system features unveiled.",
            url="https://example.com/item",
            category="developer",
            summary_status="none",
        )
        session.add(art)
        await session.commit()
        await session.refresh(art)

        with patch("app.services.news.summarizer.get_llm_provider", return_value=FailingLLM()):
            result_art = await summarizer.summarize_article(session, art, force=True)

            assert result_art.summary_status == "failed"
            assert result_art.title == "Pivotal Rust Release"
            assert result_art.description == "New type system features unveiled."
            assert result_art.category == "developer"


# ============================================================================
# 11. DAILY EDITION VALID WHEN AI ENRICHMENT FAILS
# ============================================================================


@pytest.mark.asyncio
async def test_daily_edition_valid_when_ai_fails():
    """Verify Daily Edition curation succeeds and includes articles even if their AI summaries failed."""
    edition_service = DailyEditionService()
    target_date = date(2055, 3, 15)

    async with AsyncSessionLocal() as session:
        src = NewsSource(
            name="Mystery Chronicle",
            base_url="https://mystery.example.org",
            feed_url=f"https://mystery.example.org/{uuid.uuid4().hex[:6]}.xml",
            category="mystery",
        )
        session.add(src)
        await session.flush()

        from datetime import UTC, datetime

        art = NewsArticle(
            source_id=src.id,
            source=src,
            canonical_url=f"https://mystery.example.org/tomb-{uuid.uuid4().hex[:8]}",
            title="Uncharted Subterranean Chamber",
            description="Discovered beneath old temple grounds.",
            url="https://mystery.example.org/tomb",
            category="mystery",
            published_at=datetime(2099, 1, 1, tzinfo=UTC),
            summary_status="failed",  # AI enrichment failed
        )
        session.add(art)
        await session.commit()

        edition = await edition_service.get_or_create_today_edition(
            db=session,
            target_date=target_date,
            force_regenerate=True,
        )

        assert edition is not None
        assert edition.status == "published"
        assert edition.edition_date == target_date
        # Check that article with failed summary is included in edition
        article_ids = [ea.article_id for ea in edition.edition_articles]
        assert art.id in article_ids


# ============================================================================
# 12. DIARY ENTRY PERSISTED WHEN REFLECTION FAILS
# ============================================================================


@pytest.mark.asyncio
async def test_diary_entry_remains_saved_when_reflection_fails():
    """Verify diary entry remains safely stored in DB if explicit AI reflection encounters an error."""
    service = DiaryService()
    uid = f"user-diary-ai-{uuid.uuid4().hex[:8]}"

    class FailingDiaryLLM(LLMProvider):
        provider_name = "failing_diary_llm"

        async def generate_text(self, *args, **kwargs):
            raise LLMTimeoutError("Reflection service timeout")

        async def generate_structured(self, *args, **kwargs):
            raise LLMAPIError("Reflection service 503")

    async with AsyncSessionLocal() as session:
        # Create diary entry
        entry = await service.create_or_upsert_entry(
            session,
            user_id=uid,
            data=DiaryEntryCreateInput(
                entry_date=date(2045, 6, 20),
                title="Quiet Evening by the Lamp",
                content="Listening to the rain outside and watching the ink dry.",
                mood="peaceful",
            ),
        )
        assert entry.id is not None

        # Attempt reflection with failing LLM
        with patch("app.services.diary_service.get_llm_provider", return_value=FailingDiaryLLM()):
            from fastapi import HTTPException

            with pytest.raises(HTTPException) as exc_info:
                await service.reflect_on_entry(session, user_id=uid, entry_id=entry.id)

            assert exc_info.value.status_code == 500
            assert "Could not generate reflection" in exc_info.value.detail

        # Verify diary entry is STILL saved and untouched in the database
        persisted = await service.get_entry_or_404(session, user_id=uid, entry_id=entry.id)
        assert persisted is not None
        assert persisted.title == "Quiet Evening by the Lamp"
        assert persisted.content == "Listening to the rain outside and watching the ink dry."
        assert persisted.reflection_json is None


# ============================================================================
# 13. NOTES USABLE WHEN AI SUGGESTIONS FAIL
# ============================================================================


@pytest.mark.asyncio
async def test_notes_usable_when_ai_suggestions_fail():
    """Verify note creation and editing proceed smoothly with heuristic fallback when AI fails."""
    service = NoteService()
    uid = f"user-note-ai-{uuid.uuid4().hex[:8]}"

    class FailingNotesLLM(LLMProvider):
        provider_name = "failing_notes_llm"

        async def generate_text(self, *args, **kwargs):
            raise LLMTimeoutError("Timeout")

        async def generate_structured(self, *args, **kwargs):
            raise LLMFormatError("Malformed JSON")

    # Tag suggestion falls back cleanly without crashing
    with patch("app.services.note_service.get_llm_provider", return_value=FailingNotesLLM()):
        suggestion = await service.suggest_tags(
            title="FastAPI Telemetry Snippet",
            content="def get_stats(): return {'active': True}",
        )
        assert suggestion is not None
        assert isinstance(suggestion.suggested_tags, list)
        assert suggestion.suggested_category in ("idea", "snippet", "project")

    # Note creation and CRUD succeed completely independently of AI
    async with AsyncSessionLocal() as session:
        note = await service.create_note(
            session,
            user_id=uid,
            data=NoteCreateInput(
                title="Attic Note Without AI",
                content="Just writing down key points by hand.",
                category="thought",
                tags=["handwritten"],
            ),
        )
        assert note.id is not None
        assert note.title == "Attic Note Without AI"


# ============================================================================
# 14. DETERMINISTIC MOCK PROVIDER BEHAVIOR
# ============================================================================


@pytest.mark.asyncio
async def test_mock_provider_deterministic_behavior():
    """Verify mock provider returns consistent, deterministic responses for all schema types."""
    provider = MockLLMProvider()

    news_a = await provider.generate_structured(
        prompt="NASA Rover captures unexpected crystal formations on Martian slope",
        response_schema=NewsSummarySchema,
    )
    news_b = await provider.generate_structured(
        prompt="NASA Rover captures unexpected crystal formations on Martian slope",
        response_schema=NewsSummarySchema,
    )
    assert news_a.category == news_b.category == "science_defence"
    assert news_a.summary == news_b.summary
    assert len(news_a.key_points) == len(news_b.key_points)

    diary = await provider.generate_structured(
        prompt="Late night reflection on progress and persistence",
        response_schema=DiaryReflectionSchema,
    )
    assert isinstance(diary, DiaryReflectionSchema)
    assert len(diary.gentle_questions) >= 1

    note = await provider.generate_structured(
        prompt="Write a Python script for downloading logs",
        response_schema=NoteCategorizationSchema,
    )
    assert isinstance(note, NoteCategorizationSchema)
    assert note.suggested_category in ("idea", "snippet", "project")
