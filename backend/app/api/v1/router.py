from fastapi import APIRouter

from app.api.v1.endpoints import achievements, auth, goals, health

api_v1_router = APIRouter()

api_v1_router.include_router(health.router, tags=["Health"])
api_v1_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_v1_router.include_router(goals.router, prefix="/goals", tags=["Goals"])
api_v1_router.include_router(achievements.router, prefix="/achievements", tags=["Achievements"])
