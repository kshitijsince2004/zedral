"""M2 service configuration — all settings from environment variables."""
from __future__ import annotations

import os


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is required")
    return url


def get_cors_origins() -> list[str]:
    return os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:5174"
    ).split(",")


def get_auth_disabled() -> bool:
    return os.environ.get("AUTH_DISABLED", "false").lower() == "true"
