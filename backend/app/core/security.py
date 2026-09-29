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
    Validates authentication token from Authorization Bearer header.

    In production mode:
    - Requires configured SUPABASE_JWT_SECRET.
    - Strictly verifies Supabase HS256/configured JWT signature.
    - Rejects expired, malformed, or untrusted tokens.
    - Rejects anonymous tokens (role: 'anon').
    - Rejects tokens with missing or empty subject ('sub') claim.
    - Never accepts development/test tokens or unverified payloads.

    In development mode:
    - If SUPABASE_JWT_SECRET is configured, verifies valid signed JWTs.
    - If token is a development/test token (e.g. dev-*, test-*, dev-user),
      derives authenticated developer identity.
    - If SUPABASE_JWT_SECRET is unset, permits unverified JWT inspection for testing.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials.strip() if credentials.credentials else ""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty Authorization Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # -------------------------------------------------------------
    # Production Authentication Enforcement
    # -------------------------------------------------------------
    if settings.is_production:
        if not settings.SUPABASE_JWT_SECRET:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SUPABASE_JWT_SECRET is not configured on the server",
            )

        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[settings.SUPABASE_JWT_ALGORITHM],
                options={"verify_aud": False},
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

        # Validate subject (sub) claim
        user_id = payload.get("sub")
        if not user_id or not isinstance(user_id, str) or not user_id.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject (sub) claim",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Validate role: anonymous tokens cannot act as user sessions
        role = payload.get("role", "authenticated")
        if role == "anon":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Anonymous tokens cannot be used to authenticate user sessions",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return UserClaims(
            user_id=user_id.strip(),
            email=payload.get("email"),
            role=role,
            raw_claims=payload,
        )

    # -------------------------------------------------------------
    # Development / Test Authentication Fallback
    # -------------------------------------------------------------
    # 1. If SUPABASE_JWT_SECRET is configured in development, try verifying first
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[settings.SUPABASE_JWT_ALGORITHM],
                options={"verify_aud": False},
            )
            user_id = payload.get("sub")
            if user_id and isinstance(user_id, str) and user_id.strip():
                role = payload.get("role", "authenticated")
                if role != "anon":
                    return UserClaims(
                        user_id=user_id.strip(),
                        email=payload.get("email"),
                        role=role,
                        raw_claims=payload,
                    )
        except jwt.ExpiredSignatureError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e
        except jwt.PyJWTError:
            # Not a signed JWT; allow dev/test fallback below in dev mode
            pass

    # 2. Check for explicit dev / test tokens
    if token.startswith("dev-") or token.startswith("test-") or token in ("dev-user", "dev-token"):
        return UserClaims(
            user_id=token,
            email=f"{token}@yourlittleworld.local",
            role="authenticated",
            raw_claims={"sub": token},
        )

    # 3. Try unverified decode for inspection in development
    try:
        unverified_payload = jwt.decode(
            token,
            options={"verify_signature": False},
        )
        user_id = unverified_payload.get("sub", "dev-user")
        if not user_id or not isinstance(user_id, str) or not user_id.strip():
            user_id = "dev-user"
        return UserClaims(
            user_id=user_id.strip(),
            email=unverified_payload.get("email", "dev@yourlittleworld.local"),
            role=unverified_payload.get("role", "authenticated"),
            raw_claims=unverified_payload,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
