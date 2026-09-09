from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DecisionVersionCreate(BaseModel):
    title: str
    description: str
    status: str


class DecisionVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    decision_id: int
    created_by: int
    version_number: int
    title: str
    description: str
    status: str
    created_at: datetime