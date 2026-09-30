import logging

from app.ai.base import LLMProvider
from app.ai.exceptions import LLMConfigurationError
from app.ai.gemini_provider import GeminiLLMProvider
from app.ai.mock_provider import MockLLMProvider
from app.ai.openai_provider import OpenAILLMProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_llm_provider() -> LLMProvider | None:
    """
    Returns the configured LLMProvider instance based on environment settings.
    Returns None if the provider is explicitly disabled ('none', 'disabled', 'false').
    Raises LLMConfigurationError if a real provider is missing required keys or an unknown provider is specified.
    """
    provider_type = (settings.LLM_PROVIDER or "mock").lower().strip()

    if provider_type == "mock":
        return MockLLMProvider()

    if provider_type == "gemini":
        if not settings.GEMINI_API_KEY or not settings.GEMINI_API_KEY.strip():
            raise LLMConfigurationError(
                "GEMINI_API_KEY is required when LLM_PROVIDER is set to 'gemini'."
            )
        return GeminiLLMProvider(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
            timeout=settings.LLM_TIMEOUT,
        )

    if provider_type == "openai":
        if not settings.OPENAI_API_KEY or not settings.OPENAI_API_KEY.strip():
            raise LLMConfigurationError(
                "OPENAI_API_KEY is required when LLM_PROVIDER is set to 'openai'."
            )
        return OpenAILLMProvider(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_MODEL,
            timeout=settings.LLM_TIMEOUT,
        )

    if provider_type in ("none", "disabled", "false"):
        return None

    raise LLMConfigurationError(
        f"Unknown LLM provider '{provider_type}'. Supported providers: 'mock', 'gemini', 'openai', 'none'."
    )
