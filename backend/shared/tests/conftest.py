"""Shared test configuration for backend/shared tests."""
import pytest


@pytest.fixture
def anyio_backend():
    """Use asyncio backend only (trio is not installed)."""
    return "asyncio"
