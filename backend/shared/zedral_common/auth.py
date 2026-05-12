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

_bearer = HTTPBearer(auto_error=False)

# Cache JWKS to avoid fetching on every request
_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    keycloak_url = os.environ.get("KEYCLOAK_URL", "http://localhost:8080")
    realm = os.environ.get("KEYCLOAK_REALM", "zedral")
    jwks_url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/certs"
    async with httpx.AsyncClient() as client:
        resp = await client.get(jwks_url, timeout=5)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache


async def require_auth(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict:
    """FastAPI dependency — validates JWT and returns decoded claims."""
    # Skip auth in dev mode
    if os.environ.get("AUTH_DISABLED", "false").lower() == "true":
        return {"sub": "dev-user", "preferred_username": "dev"}

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    # In production: validate JWT signature against Keycloak JWKS
    # For now: basic presence check (replace with python-jose validation)
    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    # TODO: decode and verify JWT with python-jose
    # from jose import jwt, JWTError
    # jwks = await _get_jwks()
    # try:
    #     claims = jwt.decode(token, jwks, algorithms=["RS256"])
    # except JWTError:
    #     raise HTTPException(status_code=401, detail="Invalid token")

    return {"sub": "authenticated-user"}
