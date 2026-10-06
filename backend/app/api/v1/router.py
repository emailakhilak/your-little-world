from fastapi import APIRouter

from app.api.v1.endpoints import (
    achievements,
    auth,
    diary,
    goals,
    health,
    ledger,
    news,
    notes,
    settings,
    storybook,
)

api_v1_router = APIRouter()

api_v1_router.include_router(health.router, tags=["Health"])
api_v1_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_v1_router.include_router(goals.router, prefix="/goals", tags=["Goals"])
api_v1_router.include_router(achievements.router, prefix="/achievements", tags=["Achievements"])
api_v1_router.include_router(news.router, prefix="/news", tags=["News"])
api_v1_router.include_router(notes.router, prefix="/notes", tags=["Notes"])
api_v1_router.include_router(diary.router, prefix="/diary", tags=["Diary"])
api_v1_router.include_router(ledger.router, prefix="/ledger", tags=["Ledger"])
api_v1_router.include_router(storybook.router)
api_v1_router.include_router(settings.router)
