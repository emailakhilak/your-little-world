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
    SUPABASE_JWT_ALGORITHM: str = "HS256"

    # Timezone
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"

    # LLM Settings
    LLM_PROVIDER: str = "mock"  # "mock", "gemini", "openai", "anthropic", "none"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

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
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        if self.is_production:
            if not self.SUPABASE_JWT_SECRET or not self.SUPABASE_JWT_SECRET.strip():
                raise ValueError(
                    "SUPABASE_JWT_SECRET is required when ENVIRONMENT is set to production."
                )
        return self


settings = Settings()
