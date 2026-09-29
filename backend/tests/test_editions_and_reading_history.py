import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_daily_editions_and_reading_history():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user_a = {"Authorization": "Bearer dev-alice"}
        user_b = {"Authorization": "Bearer dev-bob"}

        # 1. Sync sources and ingest
        ingest_res = await client.post("/api/v1/news/ingest?sync_sources=true", headers=user_a)
        assert ingest_res.status_code == 200

        # 2. Curate / Get today's daily edition
        edition_res = await client.get("/api/v1/news/editions/today", headers=user_a)
        assert edition_res.status_code == 200
        edition_data = edition_res.json()
        assert "title" in edition_data
        assert "edition_articles" in edition_data
        assert edition_data["status"] == "published"

        # Check no duplicate articles in edition
        article_ids = [item["article_id"] for item in edition_data["edition_articles"]]
        assert len(article_ids) == len(set(article_ids))

        # Idempotency: calling again should return the same edition without duplicate rows
        edition_res_2 = await client.get("/api/v1/news/editions/today", headers=user_a)
        assert edition_res_2.status_code == 200
        assert edition_res_2.json()["id"] == edition_data["id"]

        # 3. List editions
        list_res = await client.get("/api/v1/news/editions", headers=user_a)
        assert list_res.status_code == 200
        assert list_res.json()["total"] >= 1

        # 4. Reading history tracking and user isolation
        if article_ids:
            target_art = article_ids[0]

            # Alice marks as read
            read_res = await client.post(f"/api/v1/news/articles/{target_art}/read", headers=user_a)
            assert read_res.status_code == 200
            assert read_res.json()["article_id"] == target_art

            # In Alice's article list, is_read must be True
            alice_articles = await client.get("/api/v1/news/articles", headers=user_a)
            alice_art_item = next(
                (a for a in alice_articles.json()["items"] if a["id"] == target_art), None
            )
            assert alice_art_item is not None
            assert alice_art_item["is_read"] is True

            # In Bob's article list, is_read must be False (user isolation!)
            bob_articles = await client.get("/api/v1/news/articles", headers=user_b)
            bob_art_item = next(
                (a for a in bob_articles.json()["items"] if a["id"] == target_art), None
            )
            assert bob_art_item is not None
            assert bob_art_item["is_read"] is False

            # Check Alice's reading history endpoint
            history_res = await client.get("/api/v1/news/reading-history", headers=user_a)
            assert history_res.status_code == 200
            assert history_res.json()["total"] >= 1


@pytest.mark.asyncio
async def test_daily_news_job_execution():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": "Bearer dev-user"}
        job_res = await client.post("/api/v1/news/daily-job?timezone=Asia/Kolkata", headers=headers)
        assert job_res.status_code == 200
        data = job_res.json()
        assert data["status"] == "success"
        assert "edition_id" in data
