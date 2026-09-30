from typing import Any

from pydantic import BaseModel, Field


class DatabaseStatus(BaseModel):
    status: str = Field(..., description="'connected' or 'disconnected'")
    dialect: str = Field(default="unknown")
    error: str = Field(default="")


class LivenessResponse(BaseModel):
    status: str = Field(default="alive", description="Process liveness state ('alive')")
    app_name: str
    environment: str


class ReadinessResponse(BaseModel):
    status: str = Field(..., description="Service readiness state ('ready' or 'not_ready')")
    database: str = Field(
        ..., description="Database connectivity state ('connected' or 'disconnected')"
    )
    dialect: str = Field(default="unknown", description="Database dialect name")


class HealthResponse(BaseModel):
    status: str = "healthy"
    app_name: str
    version: str = "0.1.0"
    environment: str
    database: dict[str, Any]
