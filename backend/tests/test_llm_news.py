import pytest
from httpx import ASGITransport, AsyncClient

from app.ai.factory import get_llm_provider
from app.ai.mock_provider import MockLLMProvider
from app.main import app
from app.schemas.llm import DiaryReflectionSchema, NewsSummarySchema, NoteCategorizationSchema


@pytest.mark.asyncio
async def test_mock_llm_provider_news_summary():
    provider = get_llm_provider()
    assert isinstance(provider, MockLLMProvider)
    assert provider.provider_name == "mock"

    structured = await provider.generate_structured(
        prompt="NASA discovers water ice in shadowed craters of the lunar south pole",
        response_schema=NewsSummarySchema,
    )
    assert isinstance(structured, NewsSummarySchema)
    assert structured.category == "science_defence"
    assert len(structured.key_points) >= 3
    assert structured.why_it_matters != ""
    assert structured.confidence > 0.5


@pytest.mark.asyncio
async def test_mock_llm_provider_diary_reflection():
    provider = MockLLMProvider()
    reflection = await provider.generate_structured(
        prompt="Today was quiet, spent the evening reading and thinking about small progress.",
        response_schema=DiaryReflectionSchema,
    )
    assert isinstance(reflection, DiaryReflectionSchema)
    assert "patience" in reflection.reflection.lower() or "quiet" in reflection.reflection.lower()
    assert len(reflection.gentle_questions) >= 1


@pytest.mark.asyncio
async def test_mock_llm_provider_note_categorization():
    provider = MockLLMProvider()
    categorization = await provider.generate_structured(
        prompt="Need to write a Python script for downloading daily telemetry",
        response_schema=NoteCategorizationSchema,
    )
    assert isinstance(categorization, NoteCategorizationSchema)
    assert categorization.suggested_category in ("idea", "snippet", "project")


@pytest.mark.asyncio
async def test_article_summarize_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First ingest or list an article
        headers = {"Authorization": "Bearer dev-user"}
        ingest_res = await client.post("/api/v1/news/ingest?sync_sources=true", headers=headers)
        assert ingest_res.status_code == 200

        articles_res = await client.get("/api/v1/news/articles?limit=1", headers=headers)
        assert articles_res.status_code == 200
        items = articles_res.json()["items"]
        assert len(items) > 0
        art_id = items[0]["id"]

        # Summarize article
        sum_res = await client.post(f"/api/v1/news/articles/{art_id}/summarize", headers=headers)
        assert sum_res.status_code == 200
        data = sum_res.json()
        assert data["summary_status"] == "completed"
        assert data["summary"] is not None
        assert data["why_it_matters"] is not None
        assert isinstance(data["key_points"], list)
