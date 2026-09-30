import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.scheduler import garden_scheduler

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("your_little_world")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} in [{settings.ENVIRONMENT}] mode...")
    if settings.ENABLE_SCHEDULER:
        garden_scheduler.start()
    else:
        logger.info("In-process scheduler is disabled by ENABLE_SCHEDULER=False configuration.")
    yield
    if settings.ENABLE_SCHEDULER:
        garden_scheduler.stop()
    logger.info(f"Shutting down {settings.APP_NAME}...")


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="Backend services for Your Little World - A cozy, personal digital sanctuary.",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS middleware with explicitly validated origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Catches unhandled server exceptions to guarantee that internal traces,
    database connection strings, or system secrets are never exposed in production.
    """
    logger.error(
        "Unhandled server exception on %s %s: %s",
        request.method,
        request.url.path,
        type(exc).__name__,
    )
    if settings.DEBUG and settings.is_development:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(exc)}"},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again later."},
    )


# Mount API v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs" if settings.DEBUG else "disabled",
        "api_v1": settings.API_V1_PREFIX,
        "health": f"{settings.API_V1_PREFIX}/health",
        "liveness": f"{settings.API_V1_PREFIX}/health/live",
        "readiness": f"{settings.API_V1_PREFIX}/health/ready",
    }
