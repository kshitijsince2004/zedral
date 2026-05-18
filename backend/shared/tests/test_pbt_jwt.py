"""Property-based tests for JWT validation.

Feature: frontend-backend-integration, Property 3: JWT valid decode and claim extraction
Feature: frontend-backend-integration, Property 4: JWT invalid token rejection

Validates: Requirements 6.2, 6.3, 6.4, 6.6, 6.7
"""
from __future__ import annotations

import os
import time
from unittest.mock import AsyncMock, patch

import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st
from jose import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

from zedral_common.auth import require_auth, clear_jwks_cache

pytestmark = pytest.mark.anyio


# --- Key generation helpers ---

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


# --- Generate a single RSA key pair for all test iterations (performance) ---

_TEST_KEYPAIR = _generate_rsa_keypair()
_TEST_PEM = _private_key_to_pem(_TEST_KEYPAIR)
_TEST_JWKS = _public_key_to_jwks(_TEST_KEYPAIR)


# --- Hypothesis strategies ---

# Generate non-empty strings for sub and preferred_username
_sub_strategy = st.text(
    min_size=1,
    max_size=100,
    alphabet=st.characters(
        whitelist_categories=("Lu", "Ll", "Nd"),
        whitelist_characters="-_.",
    ),
)

_username_strategy = st.text(
    min_size=1,
    max_size=100,
    alphabet=st.characters(
        whitelist_categories=("Lu", "Ll", "Nd"),
        whitelist_characters="-_.",
    ),
)

_role_strategy = st.text(
    min_size=1,
    max_size=30,
    alphabet=st.characters(
        whitelist_categories=("Lu", "Ll", "Nd"),
        whitelist_characters="-_",
    ),
)

_roles_strategy = st.lists(_role_strategy, min_size=0, max_size=10)


# --- Helpers ---

def _make_request():
    """Create a mock request object."""
    request = AsyncMock()
    return request


def _make_credentials(token: str):
    """Create mock credentials."""
    creds = AsyncMock()
    creds.credentials = token
    return creds


# --- Property Test ---

@given(
    sub=_sub_strategy,
    preferred_username=_username_strategy,
    roles=_roles_strategy,
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
async def test_jwt_valid_decode_and_claim_extraction(
    sub: str,
    preferred_username: str,
    roles: list[str],
):
    """Property 3: JWT valid decode and claim extraction.

    For any valid JWT payload containing a `sub` string, a `preferred_username`
    string, and a `realm_access.roles` array of strings, when the token is signed
    with the correct RS256 private key and has a valid `exp` and correct `iss`,
    the `require_auth` validator SHALL return a claims dict containing the exact
    same `sub`, `preferred_username`, and `realm_access.roles` values.

    **Validates: Requirements 6.2, 6.7**
    """
    # Clear cache before each iteration
    clear_jwks_cache()

    # Build a valid JWT payload
    claims = {
        "sub": sub,
        "preferred_username": preferred_username,
        "realm_access": {"roles": roles},
        "iss": "http://localhost:8080/realms/zedral",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }

    # Sign with the test RS256 key
    token = jwt.encode(claims, _TEST_PEM, algorithm="RS256", headers={"kid": "test-key-id"})

    # Call require_auth with mocked JWKS and env
    with patch.dict(os.environ, {"AUTH_DISABLED": "false", "KEYCLOAK_URL": "http://localhost:8080", "KEYCLOAK_REALM": "zedral"}):
        with patch("zedral_common.auth._get_jwks", return_value=_TEST_JWKS):
            result = await require_auth(_make_request(), _make_credentials(token))

    # Verify exact claim preservation
    assert result["sub"] == sub, f"Expected sub={sub!r}, got {result['sub']!r}"
    assert result["preferred_username"] == preferred_username, (
        f"Expected preferred_username={preferred_username!r}, got {result['preferred_username']!r}"
    )
    assert result["realm_access"]["roles"] == roles, (
        f"Expected roles={roles!r}, got {result['realm_access']['roles']!r}"
    )


# --- Property 4: JWT invalid token rejection ---

# Generate a DIFFERENT RSA key pair for "wrong key" tests
_WRONG_KEYPAIR = _generate_rsa_keypair()
_WRONG_PEM = _private_key_to_pem(_WRONG_KEYPAIR)


# Strategy for the type of invalidity to inject
class InvalidTokenType:
    WRONG_SIGNATURE = "wrong_signature"
    EXPIRED = "expired"
    WRONG_ISSUER = "wrong_issuer"


_invalid_type_strategy = st.sampled_from([
    InvalidTokenType.WRONG_SIGNATURE,
    InvalidTokenType.EXPIRED,
    InvalidTokenType.WRONG_ISSUER,
])

# Strategy for wrong issuer values (anything that doesn't match the expected issuer)
_wrong_issuer_strategy = st.text(
    min_size=1,
    max_size=200,
    alphabet=st.characters(
        whitelist_categories=("Lu", "Ll", "Nd"),
        whitelist_characters="-_./:",
    ),
).filter(lambda s: s != "http://localhost:8080/realms/zedral")

# Strategy for expired timestamps (in the past)
_expired_exp_strategy = st.integers(
    min_value=0,
    max_value=int(time.time()) - 60,  # At least 60 seconds in the past
)


@given(
    sub=_sub_strategy,
    preferred_username=_username_strategy,
    roles=_roles_strategy,
    invalid_type=_invalid_type_strategy,
    wrong_issuer=_wrong_issuer_strategy,
    expired_exp=_expired_exp_strategy,
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
async def test_jwt_invalid_token_rejection(
    sub: str,
    preferred_username: str,
    roles: list[str],
    invalid_type: str,
    wrong_issuer: str,
    expired_exp: int,
):
    """Property 4: JWT invalid token rejection.

    For any JWT that has an invalid signature (signed with wrong key), OR has an
    `exp` timestamp in the past, OR has an `iss` claim that does not match the
    configured Keycloak realm URL, the `require_auth` validator SHALL raise an
    HTTP 401 error and SHALL NOT return decoded claims.

    **Validates: Requirements 6.3, 6.4, 6.6**
    """
    from fastapi import HTTPException

    # Clear cache before each iteration
    clear_jwks_cache()

    # Build a base JWT payload
    claims = {
        "sub": sub,
        "preferred_username": preferred_username,
        "realm_access": {"roles": roles},
        "iss": "http://localhost:8080/realms/zedral",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }

    # Inject the specific invalidity
    if invalid_type == InvalidTokenType.WRONG_SIGNATURE:
        # Sign with a DIFFERENT key than what JWKS advertises
        token = jwt.encode(claims, _WRONG_PEM, algorithm="RS256", headers={"kid": "test-key-id"})
    elif invalid_type == InvalidTokenType.EXPIRED:
        # Set exp to a past timestamp
        claims["exp"] = expired_exp
        token = jwt.encode(claims, _TEST_PEM, algorithm="RS256", headers={"kid": "test-key-id"})
    elif invalid_type == InvalidTokenType.WRONG_ISSUER:
        # Set iss to a wrong value
        claims["iss"] = wrong_issuer
        token = jwt.encode(claims, _TEST_PEM, algorithm="RS256", headers={"kid": "test-key-id"})
    else:
        raise ValueError(f"Unknown invalid type: {invalid_type}")

    # Call require_auth — it should raise HTTPException with 401
    with patch.dict(os.environ, {"AUTH_DISABLED": "false", "KEYCLOAK_URL": "http://localhost:8080", "KEYCLOAK_REALM": "zedral"}):
        with patch("zedral_common.auth._get_jwks", return_value=_TEST_JWKS):
            with pytest.raises(HTTPException) as exc_info:
                await require_auth(_make_request(), _make_credentials(token))

    # Verify it's a 401 and never returns decoded claims
    assert exc_info.value.status_code == 401, (
        f"Expected 401, got {exc_info.value.status_code} for invalid_type={invalid_type}"
    )
