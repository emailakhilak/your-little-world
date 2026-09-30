import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import get_llm_provider
from app.models.news import NewsArticle
from app.schemas.llm import NewsSummarySchema

logger = logging.getLogger(__name__)


class NewsSummarizerService:
    """
    Handles LLM summarization and structured insight generation for news articles.
    Resilient to provider absence or external API failures.
    """

    async def summarize_article(
        self,
        db: AsyncSession,
        article: NewsArticle,
        force: bool = False,
    ) -> NewsArticle:
        """
        Generates and saves structured summary for an article using configured LLMProvider.
        If provider is not configured, records 'unconfigured' status without crashing.
        """
        if article.summary_status == "completed" and not force:
            return article

        try:
            provider = get_llm_provider()
        except Exception as e:
            logger.warning(
                "LLM provider misconfigured; skipping summary for article %s: %s",
                article.id,
                type(e).__name__,
            )
            article.summary_status = "unconfigured"
            await db.commit()
            await db.refresh(article)
            return article

        if not provider:
            logger.info(f"LLM provider unconfigured; skipping summary for article {article.id}")
            article.summary_status = "unconfigured"
            await db.commit()
            await db.refresh(article)
            return article

        prompt = (
            f"Title: {article.title}\n"
            f"Category: {article.category}\n"
            f"Source: {article.source_name}\n"
            f"Description: {article.description or 'No description provided.'}\n\n"
            "Analyze this dispatch and return a structured summary containing a 2-3 sentence overview, "
            "key factual points, reflective context on why it matters, and the assigned category."
        )

        try:
            structured_summary: NewsSummarySchema = await provider.generate_structured(
                prompt=prompt,
                response_schema=NewsSummarySchema,
                system_instruction=(
                    "You are a quiet, insightful archivist observing dispatches from the outside world. "
                    "Provide clear, grounded summaries without exaggeration or hype."
                ),
                temperature=0.2,
            )

            article.summary = structured_summary.summary
            article.key_points = structured_summary.key_points
            article.why_it_matters = structured_summary.why_it_matters
            article.summary_status = "completed"
            article.summary_provider = provider.provider_name
        except Exception as e:
            logger.warning(
                "Failed to generate summary for article %s: %s", article.id, type(e).__name__
            )
            article.summary_status = "failed"

        await db.commit()
        await db.refresh(article)
        return article
