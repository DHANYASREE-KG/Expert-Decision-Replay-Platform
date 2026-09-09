from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    get_current_user,
    get_optional_current_user,
    hash_password,
    verify_password,
    verify_token,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    target_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    is_privileged = target_role.lower() in ("reviewer", "manager", "administrator", "admin")
    is_admin = current_user is not None and (current_user.role or "").lower() in ("administrator", "admin")

    # RBAC: Only Administrators can create privileged users (Reviewer, Manager, Administrator)
    if is_privileged and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create privileged users while normally reviewer and manager account is not created"
        )

    # Check if ID already exists when explicit ID is passed
    if user.id is not None:
        if db.query(User).filter(User.id == user.id).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with ID {user.id} already exists"
            )


    # Check if email is already registered
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Check if employee_id is already registered
    if user.employee_id and db.query(User).filter(User.employee_id == user.employee_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee ID already registered"
        )

    user_kwargs = {
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "employee_id": user.employee_id,
        "department": user.department,
        "designation": user.designation,
        "phone_number": user.phone_number,
        "password": hash_password(user.password),
    }
    if user.id is not None:
        user_kwargs["id"] = user.id

    new_user = User(**user_kwargs)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    identifier = login_data.email.strip()
    user = (
        db.query(User)
        .filter(
            (User.email.ilike(identifier)) |
            (User.full_name.ilike(identifier)) |
            (User.employee_id.ilike(identifier))
        )
        .first()
    )

    if user is None or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password",
        )

    if login_data.role and login_data.role.strip():
        req_role = login_data.role.strip().lower()
        user_role = (user.role or "").strip().lower()
        is_admin_match = (req_role in ("administrator", "admin")) and (user_role in ("administrator", "admin"))
        if not is_admin_match and req_role != user_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Account '{user.full_name}' is a '{user.role}', but '{login_data.role}' role was required."
            )

    return {
        "access_token": create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "role": user.role,
            }
        ),
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
    }


@router.get("", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    return db.query(User).order_by(User.id.asc()).all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    # RBAC: Non-admins can only update their own profile; admin required to update others
    if current_user is not None:
        is_admin = current_user.role.lower() in ("administrator", "admin")
        is_self = current_user.id == user_id
        if not is_self and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Users can only update their own profile"
            )
        if user_data.role is not None and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can change roles"
            )


    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_data.email is not None and user_data.email != user.email:
        if db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(status_code=409, detail="Email already registered")
        user.email = user_data.email

    if user_data.employee_id is not None and user_data.employee_id != user.employee_id:
        if db.query(User).filter(User.employee_id == user_data.employee_id).first():
            raise HTTPException(status_code=409, detail="Employee ID already registered")
        user.employee_id = user_data.employee_id

    if user_data.full_name is not None:
        user.full_name = user_data.full_name

    if user_data.role is not None:
        user.role = user_data.role.value if hasattr(user_data.role, "value") else str(user_data.role)

    if user_data.department is not None:
        user.department = user_data.department

    if user_data.designation is not None:
        user.designation = user_data.designation

    if user_data.phone_number is not None:
        user.phone_number = user_data.phone_number

    if user_data.password is not None:
        user.password = hash_password(user_data.password)

    db.commit()
    db.refresh(user)

    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    # RBAC: Only Administrators can delete users
    if current_user is not None and current_user.role.lower() not in ("administrator", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete users"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}