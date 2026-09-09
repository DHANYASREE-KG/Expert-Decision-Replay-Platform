from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.audit_service import log_security

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else None
    identifier = login_data.email.strip()

    # Search user by email, full name, or employee_id (case-insensitive)
    user = (
        db.query(User)
        .filter(
            (User.email.ilike(identifier)) |
            (User.full_name.ilike(identifier)) |
            (User.employee_id.ilike(identifier))
        )
        .first()
    )

    if not user:
        log_security(
            db,
            event_type="LOGIN_FAILED",
            email=login_data.email,
            description=f"Failed login attempt: User '{identifier}' not found",
            ip_address=ip,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password"
        )

    if not verify_password(login_data.password, user.password):
        log_security(
            db,
            event_type="LOGIN_FAILED",
            user_id=user.id,
            email=user.email,
            description=f"Failed login attempt: Invalid password for user '{user.email}'",
            ip_address=ip,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password"
        )

    # Enforce role verification if a target role was selected
    if login_data.role and login_data.role.strip():
        req_role = login_data.role.strip().lower()
        user_role = (user.role or "").strip().lower()
        is_admin_match = (req_role in ("administrator", "admin")) and (user_role in ("administrator", "admin"))
        if not is_admin_match and req_role != user_role:
            log_security(
                db,
                event_type="LOGIN_ROLE_MISMATCH",
                user_id=user.id,
                email=user.email,
                description=f"Access denied: User '{user.email}' ({user.role}) attempted login as '{login_data.role}'",
                ip_address=ip,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Account '{user.full_name}' is a '{user.role}', but '{login_data.role}' role was required."
            )

    access_token = create_access_token(user.id)

    log_security(
        db,
        event_type="LOGIN_SUCCESS",
        user_id=user.id,
        email=user.email,
        description=f"User {user.id} ({user.role}) logged in successfully",
        ip_address=ip,
    )
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
    }