"""
Custom application-level exceptions for the AI / LLM subsystem.
Ensures provider-specific details, secrets, and raw internal traces are never leaked.
"""


class LLMError(Exception):
    """Base exception for all LLM provider operations."""

    pass


class LLMConfigurationError(LLMError):
    """Raised when an LLM provider is incorrectly configured or missing required keys."""

    pass


class LLMTimeoutError(LLMError):
    """Raised when a request to an external LLM provider times out."""

    pass


class LLMAuthenticationError(LLMError):
    """Raised when credentials/API keys are invalid or rejected by the provider."""

    pass


class LLMRateLimitError(LLMError):
    """Raised when an external LLM provider rejects requests due to quota/rate limits."""

    pass


class LLMAPIError(LLMError):
    """Raised when an external LLM provider encounters a server or network failure."""

    pass


class LLMFormatError(LLMError):
    """Raised when LLM output cannot be parsed into the requested structured schema."""

    pass
