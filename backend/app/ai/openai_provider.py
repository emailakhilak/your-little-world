import json
import logging
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.ai.base import LLMProvider
from app.ai.exceptions import (
    LLMAPIError,
    LLMAuthenticationError,
    LLMConfigurationError,
    LLMFormatError,
    LLMRateLimitError,
    LLMTimeoutError,
)
from app.ai.utils import clean_json_text, sanitize_text

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class OpenAILLMProvider(LLMProvider):
    """
    OpenAI-compatible LLM provider using direct HTTP requests.
    Supports structured JSON generation using json_schema response format.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        timeout: float = 30.0,
    ) -> None:
        if not api_key or not api_key.strip():
            raise LLMConfigurationError("OPENAI_API_KEY must not be empty.")
        self.api_key = api_key.strip()
        self.model = model.strip() if model else "gpt-4o-mini"
        self.timeout = float(timeout) if timeout > 0 else 30.0
        self.base_url = "https://api.openai.com/v1/chat/completions"

    def __repr__(self) -> str:
        return f"<OpenAILLMProvider model='{self.model}'>"

    @property
    def provider_name(self) -> str:
        return "openai"

    def _get_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.7,
        **kwargs: Any,
    ) -> str:
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(self.base_url, headers=self._get_headers(), json=payload)
                resp.raise_for_status()
                data = resp.json()
        except httpx.TimeoutException as exc:
            raise LLMTimeoutError(f"OpenAI request timed out after {self.timeout}s.") from exc
        except httpx.HTTPStatusError as exc:
            code = exc.response.status_code
            if code in (401, 403):
                raise LLMAuthenticationError(
                    f"OpenAI authentication failed (HTTP {code})."
                ) from exc
            if code == 429:
                raise LLMRateLimitError("OpenAI rate limit reached (HTTP 429).") from exc
            if code >= 500:
                raise LLMAPIError(f"OpenAI server error (HTTP {code}).") from exc
            raise LLMAPIError(f"OpenAI API error (HTTP {code}).") from exc
        except httpx.RequestError as exc:
            raise LLMAPIError("OpenAI network connection error.") from exc
        except Exception as exc:
            raise LLMAPIError(
                f"OpenAI unexpected request error: {sanitize_text(str(exc), [self.api_key])}"
            ) from exc

        choices = data.get("choices", [])
        if not choices:
            return ""
        return choices[0].get("message", {}).get("content", "") or ""

    async def generate_structured(
        self,
        prompt: str,
        response_schema: type[T],
        system_instruction: str | None = None,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> T:
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": response_schema.__name__,
                    "strict": True,
                    "schema": response_schema.model_json_schema(),
                },
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(self.base_url, headers=self._get_headers(), json=payload)
                resp.raise_for_status()
                data = resp.json()
        except httpx.TimeoutException as exc:
            raise LLMTimeoutError(f"OpenAI request timed out after {self.timeout}s.") from exc
        except httpx.HTTPStatusError as exc:
            code = exc.response.status_code
            if code in (401, 403):
                raise LLMAuthenticationError(
                    f"OpenAI authentication failed (HTTP {code})."
                ) from exc
            if code == 429:
                raise LLMRateLimitError("OpenAI rate limit reached (HTTP 429).") from exc
            if code >= 500:
                raise LLMAPIError(f"OpenAI server error (HTTP {code}).") from exc
            raise LLMAPIError(f"OpenAI API error (HTTP {code}).") from exc
        except httpx.RequestError as exc:
            raise LLMAPIError("OpenAI network connection error.") from exc
        except Exception as exc:
            raise LLMAPIError(
                f"OpenAI unexpected request error: {sanitize_text(str(exc), [self.api_key])}"
            ) from exc

        choices = data.get("choices", [])
        if not choices:
            raise LLMFormatError("OpenAI returned empty choices response.")

        content = choices[0].get("message", {}).get("content", "")
        if not content or not content.strip():
            raise LLMFormatError("OpenAI returned blank structured content.")

        cleaned_text = clean_json_text(content)

        try:
            parsed_data = json.loads(cleaned_text)
        except json.JSONDecodeError as exc:
            logger.warning("Failed to decode JSON from OpenAI structured output.")
            raise LLMFormatError("OpenAI response is not valid JSON.") from exc

        try:
            return response_schema.model_validate(parsed_data)
        except ValidationError as exc:
            logger.warning("OpenAI JSON output failed Pydantic schema validation.")
            raise LLMFormatError("OpenAI output failed schema validation.") from exc
