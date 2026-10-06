import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import patch

import jwt
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.core.config import Settings, settings
from app.core.database import (
    get_connect_args,
    get_engine_kwargs,
    normalize_database_url,
)
from app.main import app

TEST_JWT_SECRET = "production-test-secret-key-32-chars-long!"


def create_test_jwt(
    sub: str | None = "user-123",
    email: str | None = "user@example.com",
    role: str = "authenticated",
    secret: str = TEST_JWT_SECRET,
    algorithm: str = "HS256",
    expires_in_seconds: int = 3600,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "exp": int((now + timedelta(seconds=expires_in_seconds)).timestamp()),
        "iat": int(now.timestamp()),
        "aud": "authenticated",
    }
    if sub is not None:
        payload["sub"] = sub
    if email is not None:
        payload["email"] = email
    if role:
        payload["role"] = role
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, secret, algorithm=algorithm)


# ==============================================================
# 1. Production JWT Verification & Claims
# ==============================================================


@pytest.mark.asyncio
async def test_production_jwt_verification_success():
    """Validates that a correctly signed Supabase HS256 JWT is verified in production."""
    user_id = f"supabase-user-{uuid.uuid4().hex[:8]}"
    token = create_test_jwt(sub=user_id, email="sanctuary@yourlittleworld.local")

    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["authenticated"] is True
            assert data["user_id"] == user_id
            assert data["email"] == "sanctuary@yourlittleworld.local"
            assert data["role"] == "authenticated"


# ==============================================================
# 2. Invalid JWT Rejection in Production
# ==============================================================


@pytest.mark.asyncio
async def test_production_rejects_invalid_jwt_signature():
    """Tokens signed with a different secret must be rejected with 401."""
    token = create_test_jwt(secret="wrong-unauthorized-secret-key-12345")

    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 401
            assert "Invalid authentication token" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_production_rejects_expired_jwt():
    """Expired tokens must be rejected with 401."""
    token = create_test_jwt(expires_in_seconds=-60)

    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 401
            assert resp.json()["detail"] == "Token has expired"


@pytest.mark.asyncio
async def test_production_rejects_missing_or_empty_sub_claim():
    """Tokens lacking a valid subject identifier must be rejected with 401."""
    token_no_sub = create_test_jwt(sub=None)
    token_empty_sub = create_test_jwt(sub="   ")

    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            for bad_token in (token_no_sub, token_empty_sub):
                resp = await client.get(
                    "/api/v1/auth/me",
                    headers={"Authorization": f"Bearer {bad_token}"},
                )
                assert resp.status_code == 401
                assert "missing subject" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_production_rejects_anonymous_tokens():
    """Supabase anon key tokens (role: 'anon') cannot authenticate user sessions."""
    anon_token = create_test_jwt(role="anon")

    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {anon_token}"},
            )
            assert resp.status_code == 401
            assert "Anonymous tokens cannot be used" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_production_rejects_dev_fallback_tokens():
    """Development / test fallback tokens must NEVER be accepted in production."""
    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            for dev_token in ("dev-user", "test-user-123", "dev-alice-sanctuary"):
                resp = await client.get(
                    "/api/v1/auth/me",
                    headers={"Authorization": f"Bearer {dev_token}"},
                )
                assert resp.status_code == 401


@pytest.mark.asyncio
async def test_production_unconfigured_secret_returns_500():
    """When running in production without SUPABASE_JWT_SECRET, auth requests fail with 500."""
    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_ALGORITHM", "HS256"),
        patch.object(settings, "SUPABASE_JWT_SECRET", ""),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": "Bearer some-token"},
            )
            assert resp.status_code == 500
            assert "SUPABASE_JWT_SECRET is not configured" in resp.json()["detail"]


# ==============================================================
# 3. Development / Test Fallback Behavior
# ==============================================================


@pytest.mark.asyncio
async def test_development_fallback_tokens_accepted():
    """In development mode, dev-* and test-* tokens provide non-blocking local identities."""
    with (
        patch.object(settings, "ENVIRONMENT", "development"),
        patch.object(settings, "SUPABASE_JWT_SECRET", ""),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp1 = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": "Bearer dev-botanist-1"},
            )
            assert resp1.status_code == 200
            assert resp1.json()["user_id"] == "dev-botanist-1"

            resp2 = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": "Bearer test-wanderer-2"},
            )
            assert resp2.status_code == 200
            assert resp2.json()["user_id"] == "test-wanderer-2"


# ==============================================================
# 4. User Isolation With Verified Identities
# ==============================================================


@pytest.mark.asyncio
async def test_cross_user_resource_isolation_with_verified_tokens():
    """Ensures User B cannot read, update, or delete User A's goals and notes."""
    alice_id = f"supabase-alice-{uuid.uuid4().hex[:8]}"
    bob_id = f"supabase-bob-{uuid.uuid4().hex[:8]}"

    alice_token = create_test_jwt(sub=alice_id, email="alice@sanctuary.local")
    bob_token = create_test_jwt(sub=bob_id, email="bob@sanctuary.local")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    with (
        patch.object(settings, "ENVIRONMENT", "production"),
        patch.object(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Alice creates a private goal
            create_goal_resp = await client.post(
                "/api/v1/goals",
                headers=alice_headers,
                json={"title": "Alice's Secret Seed", "category": "personal"},
            )
            assert create_goal_resp.status_code == 201
            alice_goal_id = create_goal_resp.json()["id"]

            # 2. Alice creates a private note
            create_note_resp = await client.post(
                "/api/v1/notes",
                headers=alice_headers,
                json={"title": "Alice's Fleeting Spark", "content": "Keep secret"},
            )
            assert create_note_resp.status_code == 201
            alice_note_id = create_note_resp.json()["id"]

            # 3. Bob lists goals -> Alice's goal must not be included
            bob_goals = await client.get("/api/v1/goals", headers=bob_headers)
            assert bob_goals.status_code == 200
            bob_goal_ids = [g["id"] for g in bob_goals.json()["items"]]
            assert alice_goal_id not in bob_goal_ids

            # 4. Bob attempts to fetch Alice's goal directly -> 404
            bob_fetch_goal = await client.get(f"/api/v1/goals/{alice_goal_id}", headers=bob_headers)
            assert bob_fetch_goal.status_code == 404

            # 5. Bob attempts to delete Alice's goal -> 404
            bob_delete_goal = await client.delete(
                f"/api/v1/goals/{alice_goal_id}", headers=bob_headers
            )
            assert bob_delete_goal.status_code == 404

            # 6. Bob lists notes -> Alice's note must not be included
            bob_notes = await client.get("/api/v1/notes", headers=bob_headers)
            assert bob_notes.status_code == 200
            bob_note_ids = [n["id"] for n in bob_notes.json()["items"]]
            assert alice_note_id not in bob_note_ids

            # 7. Bob attempts to fetch Alice's note directly -> 404
            bob_fetch_note = await client.get(f"/api/v1/notes/{alice_note_id}", headers=bob_headers)
            assert bob_fetch_note.status_code == 404

            # 8. Alice still has full access to her items
            alice_verify = await client.get(f"/api/v1/goals/{alice_goal_id}", headers=alice_headers)
            assert alice_verify.status_code == 200
            assert alice_verify.json()["title"] == "Alice's Secret Seed"


# ==============================================================
# 5. Database Connection & Pooling Configuration
# ==============================================================


def test_database_url_normalization():
    """Ensures postgres:// and sslmode query parameters are adapted for asyncpg."""
    # postgres:// to postgresql+asyncpg://
    assert (
        normalize_database_url("postgres://user:pass@host:5432/db")
        == "postgresql+asyncpg://user:pass@host:5432/db"
    )

    # postgresql:// to postgresql+asyncpg://
    assert (
        normalize_database_url("postgresql://user:pass@host:5432/db")
        == "postgresql+asyncpg://user:pass@host:5432/db"
    )

    # libpq sslmode=require to asyncpg ssl=require
    assert (
        normalize_database_url("postgresql+asyncpg://user:pass@host:5432/db?sslmode=require")
        == "postgresql+asyncpg://user:pass@host:5432/db?ssl=require"
    )

    # Preserves SQLite unchanged
    assert (
        normalize_database_url("sqlite+aiosqlite:///./test.db") == "sqlite+aiosqlite:///./test.db"
    )


def test_connect_args_and_pooler_handling():
    """Ensures Supabase connection pooler port 6543 sets statement_cache_size=0."""
    # SQLite
    sqlite_args = get_connect_args("sqlite+aiosqlite:///./test.db")
    assert sqlite_args == {"check_same_thread": False}

    # Supabase Transaction Pooler (port 6543)
    pooler_url = "postgresql+asyncpg://postgres.xyz:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
    pooler_args = get_connect_args(pooler_url)
    assert pooler_args.get("statement_cache_size") == 0
    assert pooler_args.get("ssl") == "require"

    # Engine kwargs for PostgreSQL vs SQLite
    pg_kwargs = get_engine_kwargs(pooler_url, is_dev=False)
    assert pg_kwargs["pool_size"] == settings.DB_POOL_SIZE
    assert pg_kwargs["max_overflow"] == settings.DB_MAX_OVERFLOW
    assert pg_kwargs["pool_recycle"] == settings.DB_POOL_RECYCLE
    assert pg_kwargs["pool_pre_ping"] is True
    assert pg_kwargs["echo"] is False

    sqlite_kwargs = get_engine_kwargs("sqlite+aiosqlite:///./test.db", is_dev=True)
    assert "pool_size" not in sqlite_kwargs
    assert sqlite_kwargs["pool_pre_ping"] is True


# ==============================================================
# 6. Environment Settings Validation
# ==============================================================


def test_settings_production_validation():
    """Production settings validation requires SUPABASE_JWT_SECRET for HS256."""
    # Missing secret in production raises ValidationError
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_ALGORITHM="HS256",
            SUPABASE_JWT_SECRET="",
            SUPABASE_JWKS_URL="",
        )
    assert "SUPABASE_JWT_SECRET is required" in str(exc.value)

    # Provided secret succeeds
    prod_settings = Settings(
        ENVIRONMENT="production",
        SUPABASE_JWT_ALGORITHM="HS256",
        SUPABASE_JWT_SECRET="valid-prod-secret-12345",
        SUPABASE_JWKS_URL="",
    )
    assert prod_settings.is_production is True
    assert prod_settings.is_development is False

    # Development allows empty secret
    dev_settings = Settings(ENVIRONMENT="development", SUPABASE_JWT_SECRET="")
    assert dev_settings.is_production is False
    assert dev_settings.is_development is True


def test_cors_origins_parsing():
    """Validates CORS string and list parsing."""
    s1 = Settings(CORS_ORIGINS="http://example.com, https://app.example.com")
    assert s1.CORS_ORIGINS == ["http://example.com", "https://app.example.com"]

    s2 = Settings(CORS_ORIGINS=["https://custom.sanctuary.local"])
    assert s2.CORS_ORIGINS == ["https://custom.sanctuary.local"]
