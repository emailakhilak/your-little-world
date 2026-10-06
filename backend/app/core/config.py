from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "Your Little World API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    # Default to local SQLite for tests/offline, override with Supabase PostgreSQL in .env
    DATABASE_URL: str = "sqlite+aiosqlite:///./test.db"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 1800
    DB_POOL_TIMEOUT: int = 30

    # Supabase Auth
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_JWT_ALGORITHM: str = "ES256"
    SUPABASE_JWKS_URL: str = ""

    # Scheduler Settings
    # Can be set to False on auxiliary web workers if running multiple uvicorn processes
    ENABLE_SCHEDULER: bool = True

    # Timezone
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"

    # LLM Settings
    LLM_PROVIDER: str = "mock"  # "mock", "gemini", "openai", "none"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: str = ""
    LLM_TIMEOUT: float = 30.0

    # Notification Settings
    NOTIFICATION_PROVIDER: str = "log"  # "log", "webhook"
    NOTIFICATION_WEBHOOK_URL: str = ""

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    @property
    def is_development(self) -> bool:
        return not self.is_production

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                import json

                try:
                    parsed = json.loads(v_stripped)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except Exception:
                    pass
            return [i.strip() for i in v_stripped.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i).strip() for i in v if str(i).strip()]
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        if self.is_production:
            # 1. JWT verification credentials check
            algorithm = (self.SUPABASE_JWT_ALGORITHM or "ES256").upper()
            is_asymmetric = algorithm.startswith(("RS", "ES", "PS"))

            if is_asymmetric:
                if not self.SUPABASE_JWKS_URL and not self.SUPABASE_URL:
                    raise ValueError(
                        "SUPABASE_JWKS_URL or SUPABASE_URL is required when using asymmetric "
                        "JWT algorithms in production."
                    )
            else:
                if not self.SUPABASE_JWT_SECRET or not self.SUPABASE_JWT_SECRET.strip():
                    raise ValueError(
                        "SUPABASE_JWT_SECRET is required when ENVIRONMENT is set to production."
                    )

            # 2. CORS configuration check (no wildcards allowed with credentials)
            if "*" in self.CORS_ORIGINS:
                raise ValueError(
                    "Wildcard CORS origins ('*') are strictly disallowed in production "
                    "when allow_credentials=True."
                )
            if not self.CORS_ORIGINS:
                raise ValueError(
                    "At least one explicit CORS origin must be configured in production."
                )

        return self

    @model_validator(mode="after")
    def validate_llm_configuration(self) -> "Settings":
        provider = (self.LLM_PROVIDER or "mock").lower().strip()
        if provider == "gemini":
            if not self.GEMINI_API_KEY or not self.GEMINI_API_KEY.strip():
                raise ValueError("GEMINI_API_KEY is required when LLM_PROVIDER is set to 'gemini'.")
        elif provider == "openai":
            if not self.OPENAI_API_KEY or not self.OPENAI_API_KEY.strip():
                raise ValueError("OPENAI_API_KEY is required when LLM_PROVIDER is set to 'openai'.")
        elif provider not in ("mock", "gemini", "openai", "anthropic", "none", "disabled", "false"):
            raise ValueError(
                f"Unknown LLM_PROVIDER '{self.LLM_PROVIDER}'. Supported providers: 'mock', 'gemini', 'openai', 'none'."
            )
        return self


settings = Settings()
