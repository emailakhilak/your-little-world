import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


class UserClaims(BaseModel):
    user_id: str
    email: str | None = None
    role: str | None = "authenticated"
    raw_claims: dict = {}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UserClaims:
    """
    Validates Supabase JWT access token from Authorization header.
    Returns parsed user claims or raises 401 Unauthorized.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # If Supabase JWT Secret is configured, verify signature
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            return UserClaims(
                user_id=payload.get("sub", ""),
                email=payload.get("email"),
                role=payload.get("role", "authenticated"),
                raw_claims=payload,
            )
        except jwt.ExpiredSignatureError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e
        except jwt.PyJWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e

    # In local development when secret has not been set yet in .env,
    # decode unverified for development testing inspection
    if settings.ENVIRONMENT == "development":
        try:
            unverified_payload = jwt.decode(
                token,
                options={"verify_signature": False},
            )
            return UserClaims(
                user_id=unverified_payload.get("sub", "dev-user"),
                email=unverified_payload.get("email", "dev@yourlittleworld.local"),
                role="authenticated",
                raw_claims=unverified_payload,
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="SUPABASE_JWT_SECRET is not configured on the server",
    )
