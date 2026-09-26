from typing import Any

from pydantic import BaseModel, Field


class DatabaseStatus(BaseModel):
    status: str = Field(..., description="'connected' or 'disconnected'")
    dialect: str = Field(default="unknown")
    error: str = Field(default="")


class HealthResponse(BaseModel):
    status: str = "healthy"
    app_name: str
    version: str = "0.1.0"
    environment: str
    database: dict[str, Any]
