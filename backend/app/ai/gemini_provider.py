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


class GeminiLLMProvider(LLMProvider):
    """
    Direct Google Gemini API integration using HTTP requests.
    Uses 'x-goog-api-key' header for secret isolation to prevent key leakage in URLs.
    Supports structured JSON extraction via response_schema and unstructured generation.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-1.5-flash",
        timeout: float = 30.0,
    ) -> None:
        if not api_key or not api_key.strip():
            raise LLMConfigurationError("GEMINI_API_KEY must not be empty.")
        self.api_key = api_key.strip()
        self.model = model.strip() if model else "gemini-1.5-flash"
        self.timeout = float(timeout) if timeout > 0 else 30.0
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    def __repr__(self) -> str:
        return f"<GeminiLLMProvider model='{self.model}'>"

    @property
    def provider_name(self) -> str:
        return "gemini"

    def _get_headers(self) -> dict[str, str]:
        # Google Gemini REST API allows key in the 'x-goog-api-key' header
        return {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json",
        }

    async def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.7,
        **kwargs: Any,
    ) -> str:
        url = f"{self.base_url}/{self.model}:generateContent"
        payload: dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature},
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, headers=self._get_headers(), json=payload)
                resp.raise_for_status()
                data = resp.json()
        except httpx.TimeoutException as exc:
            raise LLMTimeoutError(f"Gemini request timed out after {self.timeout}s.") from exc
        except httpx.HTTPStatusError as exc:
            code = exc.response.status_code
            if code in (401, 403):
                raise LLMAuthenticationError(
                    f"Gemini authentication failed (HTTP {code})."
                ) from exc
            if code == 429:
                raise LLMRateLimitError("Gemini rate limit reached (HTTP 429).") from exc
            if code >= 500:
                raise LLMAPIError(f"Gemini server error (HTTP {code}).") from exc
            raise LLMAPIError(f"Gemini API error (HTTP {code}).") from exc
        except httpx.RequestError as exc:
            raise LLMAPIError("Gemini network connection error.") from exc
        except Exception as exc:
            raise LLMAPIError(
                f"Gemini unexpected request error: {sanitize_text(str(exc), [self.api_key])}"
            ) from exc

        candidates = data.get("candidates", [])
        if not candidates:
            return ""
        parts = candidates[0].get("content", {}).get("parts", [])
        return "".join(part.get("text", "") for part in parts)

    async def generate_structured(
        self,
        prompt: str,
        response_schema: type[T],
        system_instruction: str | None = None,
        temperature: float = 0.2,
        **kwargs: Any,
    ) -> T:
        url = f"{self.base_url}/{self.model}:generateContent"
        schema_json = response_schema.model_json_schema()

        payload: dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "responseMimeType": "application/json",
                "responseSchema": schema_json,
            },
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, headers=self._get_headers(), json=payload)
                resp.raise_for_status()
                data = resp.json()
        except httpx.TimeoutException as exc:
            raise LLMTimeoutError(f"Gemini request timed out after {self.timeout}s.") from exc
        except httpx.HTTPStatusError as exc:
            code = exc.response.status_code
            if code in (401, 403):
                raise LLMAuthenticationError(
                    f"Gemini authentication failed (HTTP {code})."
                ) from exc
            if code == 429:
                raise LLMRateLimitError("Gemini rate limit reached (HTTP 429).") from exc
            if code >= 500:
                raise LLMAPIError(f"Gemini server error (HTTP {code}).") from exc
            raise LLMAPIError(f"Gemini API error (HTTP {code}).") from exc
        except httpx.RequestError as exc:
            raise LLMAPIError("Gemini network connection error.") from exc
        except Exception as exc:
            raise LLMAPIError(
                f"Gemini unexpected request error: {sanitize_text(str(exc), [self.api_key])}"
            ) from exc

        candidates = data.get("candidates", [])
        if not candidates:
            raise LLMFormatError("Gemini returned empty candidate response.")

        parts = candidates[0].get("content", {}).get("parts", [])
        raw_text = "".join(part.get("text", "") for part in parts)
        if not raw_text.strip():
            raise LLMFormatError("Gemini returned blank structured content.")

        cleaned_text = clean_json_text(raw_text)

        try:
            parsed_data = json.loads(cleaned_text)
        except json.JSONDecodeError as exc:
            logger.warning("Failed to decode JSON from Gemini structured output.")
            raise LLMFormatError("Gemini response is not valid JSON.") from exc

        try:
            return response_schema.model_validate(parsed_data)
        except ValidationError as exc:
            logger.warning("Gemini JSON output failed Pydantic schema validation.")
            raise LLMFormatError("Gemini output failed schema validation.") from exc
