import logging

from app.ai.base import LLMProvider
from app.ai.gemini_provider import GeminiLLMProvider
from app.ai.mock_provider import MockLLMProvider
from app.ai.openai_provider import OpenAILLMProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_llm_provider() -> LLMProvider | None:
    """
    Returns the configured LLMProvider instance based on environment settings.
    Returns None if the provider is explicitly disabled or missing required API keys.
    """
    provider_type = (settings.LLM_PROVIDER or "mock").lower().strip()

    if provider_type == "mock":
        return MockLLMProvider()

    if provider_type == "gemini":
        if settings.GEMINI_API_KEY:
            return GeminiLLMProvider(api_key=settings.GEMINI_API_KEY)
        logger.warning("GEMINI provider selected but GEMINI_API_KEY is not set.")
        return None

    if provider_type == "openai":
        if settings.OPENAI_API_KEY:
            return OpenAILLMProvider(api_key=settings.OPENAI_API_KEY)
        logger.warning("OPENAI provider selected but OPENAI_API_KEY is not set.")
        return None

    if provider_type in ("none", "disabled", "false"):
        return None

    logger.warning(f"Unknown LLM provider '{provider_type}'. Returning MockLLMProvider.")
    return MockLLMProvider()
