"""
Priority overrides router for m1-demand service.
"""
from fastapi import APIRouter

router = APIRouter(tags=["overrides"])


@router.get("/priority-overrides/")
async def list_overrides():
    """List all active priority overrides."""
    return []
