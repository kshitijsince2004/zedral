"""M6 Dispatch Service — Pydantic v2 schemas."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Dispatch ─────────────────────────────────────────────────────────────────

class DispatchList(BaseModel):
    dispatch_id: str
    wc_id: str
    shift_date: date
    shift: str
    shift_start: datetime
    shift_end: datetime
    status: str
    generated_at: datetime
    published_at: Optional[datetime] = None


class DispatchItem(BaseModel):
    item_id: str
    dispatch_id: str
    wo_id: Optional[str] = None
    sequence_in_shift: int
    op_type: str
    planned_prod_start: Optional[datetime] = None
    planned_prod_end: Optional[datetime] = None
    planned_qty_mt: Optional[float] = None
    actual_status: str
    actual_qty_mt: Optional[float] = None
    actual_scrap_mt: Optional[float] = None


class DispatchListCreate(BaseModel):
    wc_id: str
    shift_date: date
    shift: str = Field(..., pattern="^[ABC]$")
    shift_start: datetime
    shift_end: datetime
    items: list[dict[str, Any]] = []


# ── Job Row (frontend shape) ──────────────────────────────────────────────────

class JobRow(BaseModel):
    wo: str
    status: str   # done | running | queued | setup
    plannedStart: str
    plannedEnd: str
    actualStart: Optional[str] = None
    actualEnd: Optional[str] = None
    material: str
    qty: float


# ── Production Line (frontend shape) ─────────────────────────────────────────

class StoppageInfo(BaseModel):
    reason: str
    category: str
    startedAt: str
    durationMin: int


class ProductionLine(BaseModel):
    id: str
    status: str
    woId: str
    material: str
    gauge: str
    width: str
    progress: float
    startTime: str
    plannedEnd: str
    targetMt: float
    actualMt: float
    coilId: str
    coilMountedAt: str
    operator: str
    stoppage: Optional[StoppageInfo] = None
    setupNote: Optional[str] = None
    setupElapsed: Optional[int] = None
    setupPlanned: Optional[int] = None


# ── Alert Row ─────────────────────────────────────────────────────────────────

class AlertRow(BaseModel):
    id: str
    severity: str
    line: str
    message: str
    at: str


# ── Execution Event ───────────────────────────────────────────────────────────

class ExecutionEventIn(BaseModel):
    event_id: str
    dispatch_item_id: Optional[str] = None
    wc_id: str
    wo_id: Optional[str] = None
    event_type: str
    occurred_at: datetime
    operator_id: str
    device_id: str
    shift: Optional[str] = None
    payload: dict[str, Any] = {}
    signature: str = "hmac-sha256:dev"


class ExecutionEventResponse(BaseModel):
    event_id: str
    dispatch_item_id: Optional[str] = None
    wc_id: str
    wo_id: Optional[str] = None
    event_type: str
    occurred_at: datetime
    recorded_at: datetime
    operator_id: str
    device_id: str
    payload: dict[str, Any]


# ── Stoppage ──────────────────────────────────────────────────────────────────

class StoppageResponse(BaseModel):
    stoppage_id: str
    wc_id: str
    wo_id: Optional[str] = None
    dispatch_item_id: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_min: Optional[int] = None
    reason_category: str
    reason_detail: Optional[str] = None
    reported_by: str
    is_active: bool


# ── Reject ────────────────────────────────────────────────────────────────────

class RejectResponse(BaseModel):
    reject_id: str
    wc_id: str
    wo_id: Optional[str] = None
    coil_id: Optional[str] = None
    reported_at: datetime
    defect_category: str
    defect_detail: Optional[str] = None
    affected_qty_mt: Optional[float] = None
    disposition: str


# ── Shift Handover ────────────────────────────────────────────────────────────

class HandoverCreate(BaseModel):
    wc_id: str
    shift_date: date
    outgoing_shift: str
    incoming_shift: str
    outgoing_operator: str
    machine_state_note: Optional[str] = None
    pending_items: list[str] = []


class HandoverResponse(BaseModel):
    handover_id: str
    wc_id: str
    shift_date: date
    outgoing_shift: str
    incoming_shift: str
    outgoing_operator: str
    machine_state_note: Optional[str] = None
    pending_items: list[str] = []
    handover_complete: bool
    incharge_signed_at: Optional[datetime] = None
    manager_approved_at: Optional[datetime] = None
    is_immutable: bool = False
    created_at: datetime


# ── Production Pass ───────────────────────────────────────────────────────────

class ProductionPassResponse(BaseModel):
    pass_id: int
    dispatch_item_id: str
    pass_number: int
    is_final: bool
    thickness_in_mm: Optional[float] = None
    thickness_out_mm: float
    reduction_pct: Optional[float] = None
    rw_tension: Optional[float] = None
    coolant_temp_c: Optional[float] = None
    coolant_press_kg_cm2: Optional[float] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_sec: Optional[int] = None
    operator_id: Optional[str] = None
    notes: Optional[str] = None


# ── Roll Change ───────────────────────────────────────────────────────────────

class RollChangeResponse(BaseModel):
    change_id: int
    wc_id: str
    occurred_at: datetime
    out_roll_top_id: Optional[str] = None
    out_roll_bottom_id: Optional[str] = None
    in_roll_top_id: str
    in_roll_bottom_id: str
    reason: str
    operator_id: Optional[str] = None
    duration_min: Optional[float] = None


# ── Shift Crew Assignment ─────────────────────────────────────────────────────

class CrewAssignmentResponse(BaseModel):
    assignment_id: int
    wc_id: str
    shift_date: date
    shift: str
    line_incharge_id: Optional[str] = None
    crew_members: list[str] = []
    crane_operator_id: Optional[str] = None
    shift_manager_id: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    confirmed_by: Optional[str] = None
