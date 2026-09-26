from abc import ABC, abstractmethod
from typing import Any, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMProvider(ABC):
    """
    Abstract Base Class for pluggable AI providers (Gemini, Claude, OpenAI, Ollama).
    Ensures the application never depends on vendor-specific SDKs.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the LLM provider."""
        pass

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.7,
        **kwargs: Any,
    ) -> str:
        """Generates standard unstructured text response."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        response_schema: type[T],
        system_instruction: str | None = None,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> T:
        """Generates structured data strictly validated against a Pydantic schema."""
        pass
