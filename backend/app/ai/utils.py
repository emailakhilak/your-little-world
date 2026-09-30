"""
Utility helpers for LLM response processing and secret sanitization.
"""

import re


def clean_json_text(text: str) -> str:
    """
    Cleans model response string before JSON parsing.
    Strips markdown code fences (```json ... ``` or ``` ... ```) if returned by the model.
    """
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        # Drop the first line with the opening fence (e.g., ```json or ```)
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        # Drop the last line if it's the closing fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()

    return stripped


def sanitize_text(text: str, secrets: list[str] | None = None) -> str:
    """
    Sanitizes any secret substrings or obvious key patterns from text (e.g., error messages).
    """
    sanitized = text
    if secrets:
        for secret in secrets:
            if secret and len(secret) > 4:
                sanitized = sanitized.replace(secret, "[REDACTED_API_KEY]")

    # Also scrub common API key patterns if present in text
    sanitized = re.sub(r"AIza[0-9A-Za-z-_]{35}", "[REDACTED_GEMINI_KEY]", sanitized)
    sanitized = re.sub(r"sk-[a-zA-Z0-9]{20,}", "[REDACTED_OPENAI_KEY]", sanitized)
    return sanitized
