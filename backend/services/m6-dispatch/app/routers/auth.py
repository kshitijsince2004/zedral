"""Badge-based operator authentication for floor console."""
from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(tags=["auth"])


class BadgeRequest(BaseModel):
    badge_id: str


class OperatorInfo(BaseModel):
    id: str
    name: str
    role: str
    work_centre: str


class BadgeResponse(BaseModel):
    valid: bool
    token: str | None = None
    operator: OperatorInfo | None = None
    error: str | None = None


@router.post("/auth/badge", response_model=BadgeResponse)
async def validate_badge(body: BadgeRequest, request: Request) -> BadgeResponse:
    """
    Validate an operator badge ID.
    
    In production, this would look up the badge in the operators table
    and return a session token. For now, accepts any non-empty badge
    and returns a default operator session.
    """
    badge_id = body.badge_id.strip()

    if not badge_id:
        return BadgeResponse(valid=False, error="Badge ID is required")

    # Look up operator by badge ID in the database
    pool = request.app.state.pool
    row = await pool.fetchrow(
        """
        SELECT skill_id AS id, operator_name AS name, skill_level AS role
        FROM master.operator_skills
        WHERE skill_id = $1
        LIMIT 1
        """,
        badge_id,
    )

    if row:
        operator = OperatorInfo(
            id=row["id"],
            name=row["name"],
            role=row["role"],
            work_centre="CRS-2",
        )
    else:
        # Accept any badge for now — return a default operator
        operator = OperatorInfo(
            id=badge_id,
            name=f"Operator {badge_id}",
            role="operator",
            work_centre="CRS-2",
        )

    return BadgeResponse(
        valid=True,
        token=f"floor-session-{badge_id}",
        operator=operator,
    )
