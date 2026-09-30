import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import MagicMock, patch

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.core.config import Settings, settings
from app.core.database import (
    check_db_connection,
    get_connect_args,
    get_engine_kwargs,
    normalize_database_url,
)
from app.main import app

TEST_JWT_SECRET = "production-test-secret-key-32-chars-long!"


def create_hs256_token(
    sub: str = "user-123",
    email: str = "user@example.com",
    role: str = "authenticated",
    secret: str = TEST_JWT_SECRET,
    expires_in_seconds: int = 3600,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "exp": int((now + timedelta(seconds=expires_in_seconds)).timestamp()),
        "iat": int(now.timestamp()),
        "aud": "authenticated",
        "sub": sub,
        "email": email,
        "role": role,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, secret, algorithm="HS256")


# ==============================================================================
# 1. PRODUCTION CONFIGURATION VALIDATION & CORS RULES
# ==============================================================================


def test_production_config_requires_jwt_secret_for_hs256():
    """In production mode with HS256, SUPABASE_JWT_SECRET is mandatory."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="",
            SUPABASE_JWT_ALGORITHM="HS256",
            CORS_ORIGINS=["https://yourlittleworld.com"],
        )
    assert "SUPABASE_JWT_SECRET is required" in str(exc.value)


def test_production_config_asymmetric_validation():
    """When using asymmetric algorithm (RS256), SUPABASE_URL or SUPABASE_JWKS_URL is required."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_ALGORITHM="RS256",
            SUPABASE_URL="",
            SUPABASE_JWKS_URL="",
            CORS_ORIGINS=["https://yourlittleworld.com"],
        )
    assert "SUPABASE_JWKS_URL or SUPABASE_URL is required" in str(exc.value)

    # Providing SUPABASE_URL succeeds
    s = Settings(
        ENVIRONMENT="production",
        SUPABASE_JWT_ALGORITHM="RS256",
        SUPABASE_URL="https://myproject.supabase.co",
        CORS_ORIGINS=["https://yourlittleworld.com"],
    )
    assert s.is_production is True


def test_production_config_rejects_wildcard_cors():
    """In production mode with credentials, wildcard CORS origins ('*') must be rejected."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="valid-secret-12345",
            CORS_ORIGINS=["*"],
        )
    assert "Wildcard CORS origins ('*') are strictly disallowed in production" in str(exc.value)


def test_production_config_rejects_empty_cors():
    """In production mode, at least one explicit CORS origin must be configured."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="valid-secret-12345",
            CORS_ORIGINS=[],
        )
    assert "At least one explicit CORS origin must be configured in production" in str(exc.value)


def test_cors_origins_parsing_robustness():
    """Validates string, JSON list, and list parsing for CORS origins."""
    s1 = Settings(CORS_ORIGINS="https://app.example.com, https://preview.example.com")
    assert s1.CORS_ORIGINS == ["https://app.example.com", "https://preview.example.com"]

    s2 = Settings(CORS_ORIGINS='["https://my-app.vercel.app"]')
    assert s2.CORS_ORIGINS == ["https://my-app.vercel.app"]


# ==============================================================================
# 2. DATABASE NORMALIZATION & SUPABASE POOLER SETTINGS
# ==============================================================================


def test_database_url_normalization_supabase():
    """Ensures Supabase connection URLs are normalized for asyncpg."""
    # Transaction pooler URL
    raw_url = "postgresql://postgres.ref:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
    norm = normalize_database_url(raw_url)
    assert norm.startswith("postgresql+asyncpg://")
    assert "ssl=require" in norm
    assert "sslmode=require" not in norm

    # Direct connection URL
    raw_direct = "postgres://postgres:secret@db.ref.supabase.co:5432/postgres?sslmode=require"
    norm_direct = normalize_database_url(raw_direct)
    assert norm_direct.startswith("postgresql+asyncpg://")
    assert "ssl=require" in norm_direct


def test_supabase_pooler_connect_args():
    """Ensures port 6543 transaction pooler sets statement_cache_size=0 and SSL."""
    url = "postgresql+asyncpg://postgres.ref:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?ssl=require"
    args = get_connect_args(url)
    assert args.get("statement_cache_size") == 0
    assert args.get("ssl") == "require"

    engine_kwargs = get_engine_kwargs(url, is_dev=False)
    assert engine_kwargs["pool_size"] == settings.DB_POOL_SIZE
    assert engine_kwargs["max_overflow"] == settings.DB_MAX_OVERFLOW
    assert engine_kwargs["pool_pre_ping"] is True


# ==============================================================================
# 3. PRODUCTION AUTHENTICATION: HS256 & ASYMMETRIC JWKS
# ==============================================================================


@pytest.mark.asyncio
async def test_production_auth_hs256_success():
    """Validates standard Supabase HS256 token verification in production."""
    uid = f"supabase-user-{uuid.uuid4().hex[:8]}"
    token = create_hs256_token(sub=uid, email="prod@yourlittleworld.local")

    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET),
        patch.object(settings, "SUPABASE_JWT_ALGORITHM", "HS256"),
        patch.object(settings, "CORS_ORIGINS", ["https://yourlittleworld.com"]),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["authenticated"] is True
            assert data["user_id"] == uid
            assert data["email"] == "prod@yourlittleworld.local"


@pytest.mark.asyncio
async def test_production_auth_asymmetric_jwks():
    """Validates RS256 token verification using JWKS client simulation."""
    # Generate RSA keypair
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()

    uid = f"asymm-user-{uuid.uuid4().hex[:8]}"
    now = datetime.now(UTC)
    payload = {
        "sub": uid,
        "email": "asymm@yourlittleworld.local",
        "role": "authenticated",
        "exp": int((now + timedelta(hours=1)).timestamp()),
        "iat": int(now.timestamp()),
        "aud": "authenticated",
    }
    headers = {"kid": "supabase-key-1"}
    rs256_token = jwt.encode(payload, private_key, algorithm="RS256", headers=headers)

    # Mock PyJWKClient signing key
    mock_signing_key = MagicMock()
    mock_signing_key.key = public_key

    mock_jwk_client = MagicMock()
    mock_jwk_client.get_signing_key_from_jwt.return_value = mock_signing_key

    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_ALGORITHM", "RS256"),
        patch.object(settings, "SUPABASE_URL", "https://mock-ref.supabase.co"),
        patch.object(settings, "CORS_ORIGINS", ["https://yourlittleworld.com"]),
        patch("app.core.security.get_jwks_client", return_value=mock_jwk_client),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/auth/me", headers={"Authorization": f"Bearer {rs256_token}"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["authenticated"] is True
            assert data["user_id"] == uid
            assert data["email"] == "asymm@yourlittleworld.local"


@pytest.mark.asyncio
async def test_production_strictly_rejects_dev_and_anon_tokens():
    """Production mode must reject dev tokens, test tokens, and anon role tokens."""
    dev_token = "dev-user-abc123"
    anon_token = create_hs256_token(sub="anon-sub", role="anon")

    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET),
        patch.object(settings, "CORS_ORIGINS", ["https://yourlittleworld.com"]),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Dev token rejected
            resp_dev = await client.get(
                "/api/v1/auth/me", headers={"Authorization": f"Bearer {dev_token}"}
            )
            assert resp_dev.status_code == 401
            assert "Invalid authentication token" in resp_dev.json()["detail"]

            # 2. Anon token rejected
            resp_anon = await client.get(
                "/api/v1/auth/me", headers={"Authorization": f"Bearer {anon_token}"}
            )
            assert resp_anon.status_code == 401
            assert "Anonymous tokens cannot be used" in resp_anon.json()["detail"]


@pytest.mark.asyncio
async def test_development_allows_dev_tokens():
    """Development mode must cleanly allow dev-*, test-*, and dev-user tokens."""
    with patch.object(settings, "ENVIRONMENT", "development"):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/auth/me", headers={"Authorization": "Bearer dev-user-sanctuary"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["authenticated"] is True
            assert data["user_id"] == "dev-user-sanctuary"


# ==============================================================================
# 4. HEALTH, LIVENESS, AND READINESS PROBES
# ==============================================================================


@pytest.mark.asyncio
async def test_liveness_probe(async_client: AsyncClient):
    """GET /api/v1/health/live returns 200 OK with process liveness state."""
    resp = await async_client.get("/api/v1/health/live")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "alive"
    assert "app_name" in data
    assert "environment" in data


@pytest.mark.asyncio
async def test_readiness_probe_connected(async_client: AsyncClient):
    """GET /api/v1/health/ready returns 200 OK when database is reachable."""
    resp = await async_client.get("/api/v1/health/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"
    assert "dialect" in data


@pytest.mark.asyncio
async def test_readiness_probe_disconnected_sanitized():
    """GET /api/v1/health/ready returns 503 and sanitized payload when DB fails."""
    mock_db_failure = {
        "status": "disconnected",
        "dialect": "postgresql",
        "error": "Database query failed",
    }
    with patch("app.api.v1.endpoints.health.check_db_connection", return_value=mock_db_failure):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/v1/health/ready")
            assert resp.status_code == 503
            data = resp.json()
            assert data["status"] == "not_ready"
            assert data["database"] == "disconnected"
            # Ensure no credentials or URLs leaked
            assert "password" not in str(data)
            assert "postgres://" not in str(data)


@pytest.mark.asyncio
async def test_check_db_connection_sanitizes_errors():
    """Verifies that check_db_connection does not leak internal exception details."""
    with patch(
        "app.core.database.AsyncSessionLocal", side_effect=RuntimeError("SecretDatabasePassword123")
    ):
        res = await check_db_connection()
        assert res["status"] == "disconnected"
        assert res["error"] == "Database query failed"
        assert "SecretDatabasePassword123" not in str(res)


# ==============================================================================
# 5. PRODUCTION ERROR HANDLING & EXCEPTION SANITIZATION
# ==============================================================================


@pytest.mark.asyncio
async def test_unhandled_exception_sanitized_in_production():
    """Unhandled server errors in production return safe, generic error details."""
    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "DEBUG", False),
        patch.object(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET),
        patch(
            "app.api.v1.endpoints.health.check_db_connection",
            side_effect=Exception("Database URL leaked: postgres://user:secret@host"),
        ),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app, raise_app_exceptions=False),
            base_url="http://test",
        ) as client:
            resp = await client.get("/api/v1/health")
            assert resp.status_code == 500
            data = resp.json()
            assert data["detail"] == "An unexpected server error occurred. Please try again later."
            assert "secret" not in str(data)
            assert "postgres" not in str(data)


# ==============================================================================
# 6. CORS BEHAVIOR IN PRODUCTION
# ==============================================================================


@pytest.mark.asyncio
async def test_cors_behavior_configured_vs_unconfigured():
    """Validates that configured origins receive CORS headers and unconfigured do not."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Allowed configured origin (http://localhost:3000 in default settings)
        resp_allowed = await client.get(
            "/api/v1/health/live",
            headers={"Origin": "http://localhost:3000"},
        )
        assert resp_allowed.status_code == 200
        assert resp_allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"
        assert resp_allowed.headers.get("access-control-allow-credentials") == "true"

        # 2. Unconfigured origin is rejected (no access-control-allow-origin)
        resp_rejected = await client.get(
            "/api/v1/health/live",
            headers={"Origin": "https://malicious-site.example.com"},
        )
        assert resp_rejected.status_code == 200
        assert "access-control-allow-origin" not in resp_rejected.headers


# ==============================================================================
# 7. MULTI-USER ISOLATION RE-VERIFICATION
# ==============================================================================


@pytest.mark.asyncio
async def test_production_multi_user_isolation():
    """Confirms complete data isolation between User A and User B."""
    alice_id = f"alice-{uuid.uuid4().hex[:8]}"
    bob_id = f"bob-{uuid.uuid4().hex[:8]}"

    alice_token = create_hs256_token(sub=alice_id, email="alice@test.local")
    bob_token = create_hs256_token(sub=bob_id, email="bob@test.local")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET),
        patch.object(settings, "CORS_ORIGINS", ["http://localhost:3000"]),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Alice creates a goal
            g_resp = await client.post(
                "/api/v1/goals",
                headers=alice_headers,
                json={"title": "Alice's Secret Haven", "category": "mindfulness"},
            )
            assert g_resp.status_code == 201
            alice_goal_id = g_resp.json()["id"]

            # Alice writes a diary entry
            d_resp = await client.post(
                "/api/v1/diary/entries",
                headers=alice_headers,
                json={
                    "entry_date": "2050-01-01",
                    "title": "Private Diary Entry",
                    "content": "Secret whispers under moonlight.",
                },
            )
            assert d_resp.status_code in (200, 201)
            alice_diary_id = d_resp.json()["id"]

            # Bob lists goals -> Alice's goal must NOT appear
            bob_goals = await client.get("/api/v1/goals", headers=bob_headers)
            assert bob_goals.status_code == 200
            bob_ids = [g["id"] for g in bob_goals.json()["items"]]
            assert alice_goal_id not in bob_ids

            # Bob attempts to fetch Alice's goal -> 404
            bob_fetch_g = await client.get(f"/api/v1/goals/{alice_goal_id}", headers=bob_headers)
            assert bob_fetch_g.status_code == 404

            # Bob attempts to fetch Alice's diary entry -> 404
            bob_fetch_d = await client.get(
                f"/api/v1/diary/entries/{alice_diary_id}", headers=bob_headers
            )
            assert bob_fetch_d.status_code == 404
