from fastapi import APIRouter, Response, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import check_db_connection
from app.schemas.health import HealthResponse, LivenessResponse, ReadinessResponse

router = APIRouter()


@router.get("/health/live", response_model=LivenessResponse, summary="Process Liveness Probe")
async def liveness_probe() -> LivenessResponse:
    """
    Liveness probe: verifies that the FastAPI process is alive and receiving traffic.
    Does not touch external dependencies.
    """
    return LivenessResponse(
        status="alive",
        app_name=settings.APP_NAME,
        environment=settings.ENVIRONMENT,
    )


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    summary="Dependency Readiness Probe",
    responses={
        200: {"description": "Service is ready and database is connected."},
        503: {"description": "Service is not ready; database is unreachable."},
    },
)
async def readiness_probe(response: Response) -> ReadinessResponse | JSONResponse:
    """
    Readiness probe: verifies that the application can serve requests by checking
    essential dependency connectivity (PostgreSQL/SQLite database).
    Never exposes credentials, database URLs, or internal connection strings.
    """
    db_status = await check_db_connection()
    is_connected = db_status.get("status") == "connected"
    dialect = db_status.get("dialect", "unknown")

    if not is_connected:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "database": "disconnected",
                "dialect": dialect,
            },
        )

    return ReadinessResponse(
        status="ready",
        database="connected",
        dialect=dialect,
    )


@router.get("/health", response_model=HealthResponse, summary="System Health Check")
async def health_check() -> HealthResponse:
    """
    Consolidated health check: returns API status, version, environment,
    and sanitized database connectivity.
    """
    db_status = await check_db_connection()
    return HealthResponse(
        status="healthy" if db_status.get("status") == "connected" else "degraded",
        app_name=settings.APP_NAME,
        version="0.1.0",
        environment=settings.ENVIRONMENT,
        database=db_status,
    )
