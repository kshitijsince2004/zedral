"""Pydantic schemas for M2 Master Data Service."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Work Centres ────────────────────────────────────────────

class WorkCentreBase(BaseModel):
    name: str
    type: str = Field(..., pattern="^(Rolling|Processing)$")
    status: str = Field("active", pattern="^(active|inactive)$")
    gauge_min_mm: Optional[float] = None
    gauge_max_mm: Optional[float] = None
    width_min_mm: Optional[int] = None
    width_max_mm: Optional[int] = None


class WorkCentreCreate(WorkCentreBase):
    wc_id: str


class WorkCentreUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    gauge_min_mm: Optional[float] = None
    gauge_max_mm: Optional[float] = None
    width_min_mm: Optional[int] = None
    width_max_mm: Optional[int] = None


class WorkCentreResponse(WorkCentreBase):
    wc_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Materials ────────────────────────────────────────────────

class MaterialBase(BaseModel):
    grade: str
    gauge_mm: float
    width_mm: int
    type: str = Field(..., pattern="^(HR|CR|FG)$")
    status: str = Field("active", pattern="^(active|inactive)$")


class MaterialCreate(MaterialBase):
    material_code: str


class MaterialResponse(MaterialBase):
    material_code: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Customers ────────────────────────────────────────────────

class CustomerBase(BaseModel):
    name: str
    priority: str = Field("medium", pattern="^(high|medium|low)$")
    status: str = Field("active", pattern="^(active|inactive)$")


class CustomerCreate(CustomerBase):
    customer_id: str


class CustomerResponse(CustomerBase):
    customer_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Operators ────────────────────────────────────────────────

class OperatorBase(BaseModel):
    name: str
    skill: str = Field(..., pattern="^(Junior|Mid|Senior)$")
    work_centre_id: Optional[str] = None
    shift_name: Optional[str] = None
    status: str = Field("active", pattern="^(active|inactive)$")


class OperatorCreate(OperatorBase):
    operator_id: str


class OperatorResponse(BaseModel):
    """Frontend-shaped operator response matching TypeScript Operator."""
    operator_id: str
    name: str
    skill: str
    work_centre: str   # work_centre_id or ""
    shift: str         # shift_name or ""
    status: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_row(cls, row: dict) -> "OperatorResponse":
        return cls(
            operator_id=row["operator_id"],
            name=row["name"],
            skill=row["skill"],
            work_centre=row["work_centre_id"] or "",
            shift=row["shift_name"] or "",
            status=row["status"],
        )


# ── Routings ─────────────────────────────────────────────────

class RoutingBase(BaseModel):
    material_code: str
    wc_id: str
    std_run_rate_mt_hr: float
    setup_time_min: int
    yield_pct: float = Field(..., ge=0, le=100)
    is_active: bool = True


class RoutingCreate(RoutingBase):
    routing_id: str


class RoutingResponse(BaseModel):
    """Frontend-shaped routing response matching TypeScript RoutingRule."""
    id: str                  # routing_id
    material_code: str
    work_centre: str         # wc_id
    ideal_rate: float        # std_run_rate_mt_hr
    setup_time: int          # setup_time_min
    yield_pct: float
    is_active: bool

    model_config = {"from_attributes": True}

    @classmethod
    def from_row(cls, row: dict) -> "RoutingResponse":
        return cls(
            id=row["routing_id"],
            material_code=row["material_code"],
            work_centre=row["wc_id"],
            ideal_rate=row["std_run_rate_mt_hr"],
            setup_time=row["setup_time_min"],
            yield_pct=row["yield_pct"],
            is_active=row["is_active"],
        )


# ── Changeover Matrix ────────────────────────────────────────

class ChangeoverMatrixEntry(BaseModel):
    wc_id: str
    grade_from: str
    grade_to: str
    gauge_step: str = "same"
    width_step: str = "same"
    roll_change_reqd: bool = False
    setup_min: int
    sample_count: int = 0

    model_config = {"from_attributes": True}


# ── Shifts ───────────────────────────────────────────────────

class ShiftResponse(BaseModel):
    """Frontend-shaped shift response matching TypeScript Shift."""
    id: str            # shift_id
    name: str
    start: str         # start_time
    end: str           # end_time
    linked_wcs: list[str]  # linked_wc_ids

    model_config = {"from_attributes": True}

    @classmethod
    def from_row(cls, row: dict) -> "ShiftResponse":
        import json as _json
        linked = row["linked_wc_ids"]
        if isinstance(linked, str):
            linked = _json.loads(linked)
        return cls(
            id=row["shift_id"],
            name=row["name"],
            start=str(row["start_time"]),
            end=str(row["end_time"]),
            linked_wcs=linked,
        )


# ── Stoppage / Defect Codes ──────────────────────────────────

class StoppageCodeResponse(BaseModel):
    code: str
    display_name: str
    bucket: str
    is_planned: bool
    is_external: bool
    sort_order: int

    model_config = {"from_attributes": True}


class DefectCodeResponse(BaseModel):
    code: str
    display_name: str
    family: str
    severity_default: Optional[str] = None
    default_disposition: Optional[str] = None
    sort_order: int

    model_config = {"from_attributes": True}
