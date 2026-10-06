import logging
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger("your_little_world.security")

bearer_scheme = HTTPBearer(auto_error=False)

# Cached JWKS clients keyed by JWKS URL
_jwks_clients: dict[str, PyJWKClient] = {}


def get_jwks_client(jwks_url: str) -> PyJWKClient:
    """Returns or creates a cached PyJWKClient instance for an asymmetric JWKS endpoint."""
    if jwks_url not in _jwks_clients:
        _jwks_clients[jwks_url] = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_clients[jwks_url]


class UserClaims(BaseModel):
    user_id: str
    email: str | None = None
    role: str | None = "authenticated"
    raw_claims: dict[str, Any] = {}


def decode_jwt_token(token: str) -> dict[str, Any]:
    """
    Decodes and cryptographically verifies a JWT token.
    Supports:
    - Asymmetric algorithms (ES256, RS256) via JWKS endpoint (SUPABASE_JWKS_URL or SUPABASE_URL)
    - Standard symmetric HS256 using SUPABASE_JWT_SECRET (when configured)
    """
    try:
        header = jwt.get_unverified_header(token)
        token_alg = (header.get("alg") or "").upper()
    except Exception:
        token_alg = ""

    configured_alg = (settings.SUPABASE_JWT_ALGORITHM or "ES256").upper()
    algorithm = token_alg if token_alg else configured_alg

    is_asymmetric = algorithm.startswith(("RS", "ES", "PS"))

    if is_asymmetric:
        jwks_url = settings.SUPABASE_JWKS_URL
        if not jwks_url and settings.SUPABASE_URL:
            jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"

        if not jwks_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SUPABASE_JWKS_URL or SUPABASE_URL is required for asymmetric JWT verification",
            )

        client = get_jwks_client(jwks_url)
        signing_key = client.get_signing_key_from_jwt(token)
        key = signing_key.key
    else:
        if not settings.SUPABASE_JWT_SECRET or not settings.SUPABASE_JWT_SECRET.strip():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SUPABASE_JWT_SECRET is not configured on the server",
            )
        key = settings.SUPABASE_JWT_SECRET

    return jwt.decode(
        token,
        key,
        algorithms=[algorithm],
        options={"verify_aud": False},
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UserClaims:
    """
    Validates authentication token from Authorization Bearer header.

    In production mode:
    - Requires configured JWT verification credentials (secret or JWKS).
    - Strictly verifies cryptographic signature (HS256 or RS256/ES256 via JWKS).
    - Rejects expired, malformed, or untrusted tokens.
    - Rejects anonymous tokens (role: 'anon').
    - Rejects tokens with missing or empty subject ('sub') claim.
    - Never accepts development/test tokens or unverified payloads.
    - Never logs tokens or sensitive headers.

    In development mode:
    - If JWT verification credentials are configured, verifies valid signed JWTs.
    - If token is a development/test token (e.g. dev-*, test-*, dev-user),
      derives authenticated developer identity.
    - If credentials are unset, permits unverified JWT inspection for local offline testing.
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
        try:
            payload = decode_jwt_token(token)
        except HTTPException:
            # Re-raise explicit 500 server configuration HTTPExceptions
            raise
        except jwt.ExpiredSignatureError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e
        except Exception as e:
            logger.warning("Token verification failed: %s", type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
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
    # 1. If configured in development, try verifying first
    if (
        settings.SUPABASE_JWT_SECRET
        or settings.SUPABASE_JWKS_URL
        or settings.SUPABASE_JWT_ALGORITHM.upper().startswith(("RS", "ES", "PS"))
    ):
        try:
            payload = decode_jwt_token(token)
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
        except Exception:
            # Not a signed JWT or invalid signature; allow dev/test fallback below in dev mode
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
