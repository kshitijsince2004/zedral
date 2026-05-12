"""Pydantic schemas for M1 Demand Service."""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class WorkOrderResponse(BaseModel):
    wo_id: str
    material_code: str
    grade: str
    gauge_mm: float
    width_mm: int
    qty_planned_mt: float
    qty_confirmed_mt: float
    required_date: date
    routing_valid: bool
    priority_class: Optional[str] = None
    priority_score: Optional[float] = None
    wo_type: str
    status: str
    hold_reason: Optional[str] = None
    rejection_reason: Optional[str] = None
    ingested_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class WorkOrderCreate(BaseModel):
    wo_id: str
    material_code: str
    grade: str
    gauge_mm: float
    width_mm: int
    qty_planned_mt: float
    required_date: date
    wo_type: str = "manual"


class WorkOrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|queued|scheduled|released|in_process|complete|cancelled|on_hold|rejected)$")


class PriorityOverrideCreate(BaseModel):
    override_type: str = Field(..., pattern="^(rush|defer|hold|release_hold)$")
    reason: str = Field(..., min_length=10)
    overridden_by: str


class PriorityOverrideResponse(BaseModel):
    override_id: str
    wo_id: str
    override_type: str
    old_score: Optional[float] = None
    new_score: Optional[float] = None
    reason: str
    overridden_by: str
    overridden_at: datetime
    is_active: bool
    model_config = {"from_attributes": True}


class SalesOrderResponse(BaseModel):
    so_id: str
    customer_id: str
    required_date: date
    total_qty_mt: float
    status: str
    net_value: Optional[float] = None
    ingested_at: datetime
    model_config = {"from_attributes": True}


class QueueItemResponse(BaseModel):
    """Work order enriched with material readiness hint for the demand queue."""
    wo_id: str
    material_code: str
    grade: str
    gauge_mm: float
    width_mm: int
    qty_planned_mt: float
    required_date: date
    priority_class: Optional[str] = None
    priority_score: Optional[float] = None
    status: str
    material_readiness: Optional[str] = None  # 'ready' | 'partial' | 'pending' | 'shortage' | None
    model_config = {"from_attributes": True}
