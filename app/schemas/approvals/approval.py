from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ApprovalCreate(BaseModel):
    decision_id: int
    reviewer_id: int
    approval_level: int = Field(ge=1)
    status: str = "Pending"
    comments: Optional[str] = None


class ApprovalUpdate(BaseModel):
    status: Optional[str] = None
    completed_at: Optional[datetime] = None
    comments: Optional[str] = None


class ApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    decision_id: int
    reviewer_id: int
    approval_level: int
    status: str
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    comments: Optional[str] = None