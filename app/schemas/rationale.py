from pydantic import BaseModel, ConfigDict


class RationaleUpdate(BaseModel):
    rationale: str


class RationaleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rationale: str