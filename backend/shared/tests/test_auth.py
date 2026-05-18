"""Unit tests for JWT validation in zedral_common.auth."""
from __future__ import annotations

import os
import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from jose import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

from zedral_common.auth import require_auth, clear_jwks_cache

pytestmark = pytest.mark.anyio


# --- Test key generation ---

def _generate_rsa_keypair():
    """Generate an RSA key pair for testing."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend(),
    )
    return private_key


def _private_key_to_pem(private_key) -> str:
    """Convert private key to PEM string."""
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")


def _public_key_to_jwks(private_key) -> dict:
    """Convert public key to JWKS format."""
    from jose.backends import RSAKey
    public_key = private_key.public_key()
    pub_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")
    rsa_key = RSAKey(pub_pem, algorithm="RS256")
    jwk = rsa_key.to_dict()
    jwk["kid"] = "test-key-id"
    jwk["use"] = "sig"
    jwk["alg"] = "RS256"
    return {"keys": [jwk]}


# --- Fixtures ---

@pytest.fixture(autouse=True)
def clear_cache():
    """Clear JWKS cache before each test."""
    clear_jwks_cache()
    yield
    clear_jwks_cache()


@pytest.fixture
def rsa_keypair():
    """Generate a fresh RSA key pair."""
    return _generate_rsa_keypair()


@pytest.fixture
def jwks(rsa_keypair):
    """Generate JWKS from the test key pair."""
    return _public_key_to_jwks(rsa_keypair)


@pytest.fixture
def private_key_pem(rsa_keypair):
    """Get PEM-encoded private key."""
    return _private_key_to_pem(rsa_keypair)


@pytest.fixture
def valid_token(rsa_keypair, private_key_pem):
    """Create a valid JWT token."""
    claims = {
        "sub": "user-123",
        "preferred_username": "testuser",
        "realm_access": {"roles": ["admin", "supervisor"]},
        "iss": "http://localhost:8080/realms/zedral",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    return jwt.encode(claims, private_key_pem, algorithm="RS256", headers={"kid": "test-key-id"})


def _make_request():
    """Create a mock request object."""
    request = AsyncMock()
    return request


def _make_credentials(token: str):
    """Create mock credentials."""
    creds = AsyncMock()
    creds.credentials = token
    return creds


# --- Tests ---

async def test_auth_disabled_bypass():
    """When AUTH_DISABLED=true, return dev-user claims without validation."""
    with patch.dict(os.environ, {"AUTH_DISABLED": "true"}):
        result = await require_auth(_make_request(), None)
    assert result == {
        "sub": "dev-user",
        "preferred_username": "dev",
        "realm_access": {"roles": ["admin"]},
    }


async def test_missing_credentials_returns_401():
    """When no credentials are provided, return 401."""
    with patch.dict(os.environ, {"AUTH_DISABLED": "false"}):
        with pytest.raises(HTTPException) as exc_info:
            await require_auth(_make_request(), None)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Missing authentication token"


async def test_valid_token_returns_claims(jwks, valid_token):
    """A valid token should return extracted claims."""
    with patch.dict(os.environ, {"AUTH_DISABLED": "false"}):
        with patch("zedral_common.auth._get_jwks", return_value=jwks):
            result = await require_auth(_make_request(), _make_credentials(valid_token))
    assert result["sub"] == "user-123"
    assert result["preferred_username"] == "testuser"
    assert result["realm_access"]["roles"] == ["admin", "supervisor"]


async def test_expired_token_returns_401(rsa_keypair, jwks):
    """An expired token should return 401 with 'Token has expired'."""
    private_key_pem = _private_key_to_pem(rsa_keypair)
    claims = {
        "sub": "user-123",
        "preferred_username": "testuser",
        "realm_access": {"roles": ["admin"]},
        "iss": "http://localhost:8080/realms/zedral",
        "exp": int(time.time()) - 3600,  # expired 1 hour ago
        "iat": int(time.time()) - 7200,
    }
    token = jwt.encode(claims, private_key_pem, algorithm="RS256", headers={"kid": "test-key-id"})

    with patch.dict(os.environ, {"AUTH_DISABLED": "false"}):
        with patch("zedral_common.auth._get_jwks", return_value=jwks):
            with pytest.raises(HTTPException) as exc_info:
                await require_auth(_make_request(), _make_credentials(token))
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token has expired"


async def test_wrong_issuer_returns_401(rsa_keypair, jwks):
    """A token with wrong issuer should return 401 with 'Invalid token issuer'."""
    private_key_pem = _private_key_to_pem(rsa_keypair)
    claims = {
        "sub": "user-123",
        "preferred_username": "testuser",
        "realm_access": {"roles": ["admin"]},
        "iss": "http://evil-server:8080/realms/hacked",  # wrong issuer
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    token = jwt.encode(claims, private_key_pem, algorithm="RS256", headers={"kid": "test-key-id"})

    with patch.dict(os.environ, {"AUTH_DISABLED": "false"}):
        with patch("zedral_common.auth._get_jwks", return_value=jwks):
            with pytest.raises(HTTPException) as exc_info:
                await require_auth(_make_request(), _make_credentials(token))
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid token issuer"


async def test_invalid_signature_returns_401(jwks):
    """A token signed with a different key should return 401 with 'Invalid token signature'."""
    # Generate a different key pair (not matching the JWKS)
    other_key = _generate_rsa_keypair()
    other_pem = _private_key_to_pem(other_key)
    claims = {
        "sub": "user-123",
        "preferred_username": "testuser",
        "realm_access": {"roles": ["admin"]},
        "iss": "http://localhost:8080/realms/zedral",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    token = jwt.encode(claims, other_pem, algorithm="RS256", headers={"kid": "test-key-id"})

    with patch.dict(os.environ, {"AUTH_DISABLED": "false"}):
        with patch("zedral_common.auth._get_jwks", return_value=jwks):
            with pytest.raises(HTTPException) as exc_info:
                await require_auth(_make_request(), _make_credentials(token))
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid token signature"


async def test_jwks_fetch_failure_returns_503():
    """When JWKS fetch fails, return 503."""
    with patch.dict(os.environ, {"AUTH_DISABLED": "false"}):
        with patch("zedral_common.auth._get_jwks", side_effect=HTTPException(
            status_code=503, detail="Authentication service unavailable"
        )):
            with pytest.raises(HTTPException) as exc_info:
                await require_auth(_make_request(), _make_credentials("some-token"))
    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Authentication service unavailable"


async def test_claims_extraction_with_missing_realm_access(jwks, rsa_keypair):
    """When realm_access is missing from claims, return empty roles list."""
    private_key_pem = _private_key_to_pem(rsa_keypair)
    claims = {
        "sub": "user-456",
        "preferred_username": "norolesuser",
        "iss": "http://localhost:8080/realms/zedral",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    token = jwt.encode(claims, private_key_pem, algorithm="RS256", headers={"kid": "test-key-id"})

    with patch.dict(os.environ, {"AUTH_DISABLED": "false"}):
        with patch("zedral_common.auth._get_jwks", return_value=jwks):
            result = await require_auth(_make_request(), _make_credentials(token))
    assert result["sub"] == "user-456"
    assert result["preferred_username"] == "norolesuser"
    assert result["realm_access"]["roles"] == []
