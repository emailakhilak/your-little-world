from fastapi import APIRouter

from app.core.config import settings
from app.core.database import check_db_connection
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="System Health Check")
async def health_check() -> HealthResponse:
    """
    Returns API status, version, environment, and database connectivity.
    """
    db_status = await check_db_connection()
    return HealthResponse(
        status="healthy" if db_status.get("status") == "connected" else "degraded",
        app_name=settings.APP_NAME,
        version="0.1.0",
        environment=settings.ENVIRONMENT,
        database=db_status,
    )
