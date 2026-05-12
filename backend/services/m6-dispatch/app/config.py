"""M6 Dispatch Service — configuration."""
from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://zedral:zedral_dev_password@localhost:5432/zedral"
    REDPANDA_BROKERS: str = "localhost:9092"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174"
    AUTH_DISABLED: str = "true"
    PLANT_ID: str = "hsl_ludhiana"
    EVENT_SIGNING_SECRET: str = "dev-secret-change-in-prod"
    PORT: int = 8004

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
