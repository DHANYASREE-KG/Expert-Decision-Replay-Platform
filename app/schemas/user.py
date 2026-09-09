from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRole(str, Enum):
    EMPLOYEE = "Employee"
    REVIEWER = "Reviewer"
    MANAGER = "Manager"
    ADMINISTRATOR = "Administrator"


class UserCreate(BaseModel):
    id: Optional[int] = None
    full_name: str
    email: EmailStr
    role: UserRole = UserRole.EMPLOYEE
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone_number: Optional[str] = None
    password: str = Field(min_length=6, max_length=72)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone_number: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=72)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email, full name, or employee ID")
    password: str = Field(..., min_length=1)
    role: Optional[str] = Field(None, description="Optional target role requirement")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Optional[str] = None
    user_id: Optional[int] = None