from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email, full name, or employee ID")
    password: str = Field(..., min_length=1)
    role: Optional[str] = Field(None, description="Optional target role requirement (e.g. Administrator)")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Optional[str] = None
    user_id: Optional[int] = None