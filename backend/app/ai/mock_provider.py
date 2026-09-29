import logging
from typing import Any, TypeVar

from pydantic import BaseModel

from app.ai.base import LLMProvider
from app.schemas.llm import DiaryReflectionSchema, NewsSummarySchema, NoteCategorizationSchema

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class MockLLMProvider(LLMProvider):
    """
    Deterministic Mock LLM provider for robust local development, offline runs, and automated testing.
    Never calls external network APIs.
    """

    @property
    def provider_name(self) -> str:
        return "mock"

    async def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.7,
        **kwargs: Any,
    ) -> str:
        return f"[Mock Reflection] Contemplating: {prompt[:80]}..."

    async def generate_structured(
        self,
        prompt: str,
        response_schema: type[T],
        system_instruction: str | None = None,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> T:
        logger.debug(f"MockLLMProvider structured generation for schema {response_schema.__name__}")

        if issubclass(response_schema, NewsSummarySchema):
            # Extract category clue from prompt if available
            category = "developer"
            prompt_lower = prompt.lower()
            if any(k in prompt_lower for k in ["space", "nasa", "esa", "defence", "physics"]):
                category = "science_defence"
            elif any(k in prompt_lower for k in ["ai", "model", "gpt", "llm", "neural"]):
                category = "ai"
            elif any(k in prompt_lower for k in ["archaeology", "mystery", "crime", "ancient"]):
                category = "mystery"

            return response_schema.model_validate(
                {
                    "summary": "A pivotal dispatch examining recent breakthroughs, methodologies, and findings.",
                    "key_points": [
                        "Identifies foundational technical context and milestones.",
                        "Highlights architectural implications for builders and researchers.",
                        "Offers a measured long-term perspective on ecosystem shifts.",
                    ],
                    "why_it_matters": "Provides thoughtful clarity on how current developments ripple into future craftsmanship.",
                    "category": category,
                    "confidence": 0.95,
                }
            )

        if issubclass(response_schema, DiaryReflectionSchema):
            return response_schema.model_validate(
                {
                    "reflection": "A quiet moment of honesty written under the lantern light. There is patience here in honoring where you stand today.",
                    "themes": ["quiet persistence", "acceptance", "inner stillness"],
                    "gentle_questions": [
                        "What part of today's effort gave you the most peace?",
                        "What expectation could you gently let go of tomorrow?",
                    ],
                }
            )

        if issubclass(response_schema, NoteCategorizationSchema):
            category = "idea"
            tags = ["note"]
            if "project" in prompt.lower():
                category = "project"
                tags.append("build")
            elif "code" in prompt.lower() or "func" in prompt.lower():
                category = "snippet"
                tags.append("code")

            return response_schema.model_validate(
                {
                    "suggested_category": category,
                    "suggested_tags": tags,
                }
            )

        # Generic fallback for any other Pydantic schema
        mock_data = {}
        for field_name, field_info in response_schema.model_fields.items():
            if field_info.annotation is str:
                mock_data[field_name] = f"Mock {field_name}"
            elif field_info.annotation == list[str]:
                mock_data[field_name] = ["Mock point 1", "Mock point 2"]
            elif field_info.annotation is float:
                mock_data[field_name] = 1.0
            elif field_info.annotation is int:
                mock_data[field_name] = 1
            else:
                mock_data[field_name] = None

        return response_schema.model_validate(mock_data)
