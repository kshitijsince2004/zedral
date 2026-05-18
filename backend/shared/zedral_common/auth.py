"""
JWT validation middleware for FastAPI.
Validates Keycloak-issued JWTs on all routes except /health.
"""
from __future__ import annotations

import os
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, ExpiredSignatureError, jwt
from jose.exceptions import JWTClaimsError

_bearer = HTTPBearer(auto_error=False)

# Cache JWKS to avoid fetching on every request
_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    """Fetch and cache the JWKS from Keycloak."""
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    keycloak_url = os.environ.get("KEYCLOAK_URL", "http://localhost:8080")
    realm = os.environ.get("KEYCLOAK_REALM", "zedral")
    jwks_url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/certs"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(jwks_url, timeout=5)
            resp.raise_for_status()
            _jwks_cache = resp.json()
    except (httpx.HTTPError, httpx.TimeoutException):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )
    return _jwks_cache


def _get_expected_issuer() -> str:
    """Build the expected issuer URL from environment variables."""
    keycloak_url = os.environ.get("KEYCLOAK_URL", "http://localhost:8080")
    realm = os.environ.get("KEYCLOAK_REALM", "zedral")
    return f"{keycloak_url}/realms/{realm}"


def clear_jwks_cache() -> None:
    """Clear the cached JWKS (useful for testing)."""
    global _jwks_cache
    _jwks_cache = None


async def require_auth(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict:
    """FastAPI dependency — validates JWT and returns decoded claims."""
    # Skip auth in dev mode
    if os.environ.get("AUTH_DISABLED", "false").lower() == "true":
        return {
            "sub": "dev-user",
            "preferred_username": "dev",
            "realm_access": {"roles": ["admin"]},
        }

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    # Fetch JWKS keys (cached after first call)
    jwks = await _get_jwks()

    # Decode and validate the JWT
    expected_issuer = _get_expected_issuer()
    try:
        claims = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={
                "verify_exp": True,
                "verify_iss": True,
                "verify_aud": False,  # Keycloak tokens may not have aud matching
            },
            issuer=expected_issuer,
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except JWTClaimsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature",
        )

    # Extract and return relevant claims
    realm_access = claims.get("realm_access", {})
    roles = realm_access.get("roles", []) if isinstance(realm_access, dict) else []

    return {
        "sub": claims.get("sub", ""),
        "preferred_username": claims.get("preferred_username", ""),
        "realm_access": {"roles": roles},
    }
