from fastapi import APIRouter, Depends

from app.core.security import UserClaims, get_current_user
from app.schemas.auth import AuthMeResponse

router = APIRouter()


@router.get("/me", response_model=AuthMeResponse, summary="Verify Current User Authentication")
async def verify_auth(
    current_user: UserClaims = Depends(get_current_user),
) -> AuthMeResponse:
    """
    Verifies the Supabase Bearer JWT token and returns verified identity claims.
    """
    return AuthMeResponse(
        authenticated=True,
        user_id=current_user.user_id,
        email=current_user.email,
        role=current_user.role,
        message="Authentication token successfully verified",
    )
