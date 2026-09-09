from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class MeetingNoteCreate(BaseModel):
    title: str
    content: str
    meeting_date: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))


class MeetingNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    meeting_date: Optional[datetime] = None


class MeetingNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    decision_id: int
    created_by: int
    title: str
    content: str
    meeting_date: datetime
    created_at: datetime
    updated_at: datetime