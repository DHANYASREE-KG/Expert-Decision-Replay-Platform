from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db

from app.models.user import User
from app.models.decision import Decision
from app.models.alternative import Alternative
from app.models.discussion_thread import DiscussionThread
from app.models.comment import Comment
from app.models.tag import Tag
from app.models.approval import Approval

from app.schemas.timeline import TimelineEvent
from app.schemas.tag import TagAssignment, TagResponse
from app.schemas.decision import (
    DecisionCreate,
    DecisionUpdate,
    DecisionResponse,
    DecisionListResponse,
    DecisionListItem,
)
from app.services.activity_service import log_activity
from app.services.audit_service import log_audit

class DecisionVerdictRequest(BaseModel):
    status: str
    comments: Optional[str] = None
    approval_level: Optional[int] = None

router = APIRouter(
    prefix="/decisions",
    tags=["Decisions"]
)



@router.post(
    "",
    response_model=DecisionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_decision(
    decision_data: DecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_decision = Decision(
        title=decision_data.title,
        problem_statement=decision_data.problem_statement,
        category=decision_data.category,
        rationale=decision_data.rationale,
        status="Draft",
        created_by=current_user.id
    )

    db.add(new_decision)
    db.flush()

    log_activity(
        db,
        user_id=current_user.id,
        action="decision_created",
        entity_type="decision",
        entity_id=new_decision.id,
        description=f"User {current_user.id} created Decision {new_decision.id}"
    )

    log_audit(
        db,
        user_id=current_user.id,
        action="CREATE",
        entity_type="Decision",
        entity_id=new_decision.id,
        description=f"User {current_user.id} created Decision {new_decision.id}",
        new_value={
            "title": new_decision.title,
            "category": new_decision.category,
            "status": new_decision.status,
        },
    )

    db.commit()
    db.refresh(new_decision)

    return new_decision


@router.get(
    "",
    response_model=List[DecisionResponse]
)
def get_decisions(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    my_only: Optional[bool] = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Decision)
    user_role = (current_user.role or "").strip()

    # If my_only is requested, return only decisions created by current user
    if my_only:
        query = query.filter(Decision.created_by == current_user.id)
    elif user_role not in ["Administrator", "Admin", "Manager", "Reviewer"]:
        # Regular Employees see their own decisions plus any submitted/reviewed/approved decisions
        query = query.filter(
            or_(
                Decision.created_by == current_user.id,
                Decision.status.in_(["Under Review", "Approved", "Rejected", "Deprecated"])
            )
        )
    # Administrators, Managers, and Reviewers see all decisions across the organization

    if category:
        query = query.filter(Decision.category == category)
    if status:
        query = query.filter(Decision.status == status)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Decision.title.ilike(s),
                Decision.problem_statement.ilike(s),
                Decision.rationale.ilike(s)
            )
        )

    decisions = query.order_by(Decision.created_at.desc()).all()
    return decisions


@router.get(
    "/search",
    response_model=DecisionListResponse
)
def search_decisions(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Decision)
    user_role = (current_user.role or "").strip()

    if user_role not in ["Administrator", "Admin", "Manager", "Reviewer"]:
        query = query.filter(
            or_(
                Decision.created_by == current_user.id,
                Decision.status.in_(["Under Review", "Approved", "Rejected", "Deprecated"])
            )
        )

    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Decision.title.ilike(search_term),
                Decision.problem_statement.ilike(search_term),
                Decision.rationale.ilike(search_term)
            )
        )

    if category:
        query = query.filter(Decision.category == category)

    if tag:
        query = query.filter(Decision.tags.any(name=tag))

    if status:
        query = query.filter(Decision.status == status)

    if start_date:
        try:
            s_dt = datetime.fromisoformat(start_date)
            query = query.filter(Decision.created_at >= s_dt)
        except ValueError:
            pass

    if end_date:
        try:
            e_dt = datetime.fromisoformat(end_date)
            query = query.filter(Decision.created_at <= e_dt)
        except ValueError:
            pass

    allowed_sort_fields = {
        "created_at": Decision.created_at,
        "updated_at": Decision.updated_at,
        "title": Decision.title,
    }
    if sort not in allowed_sort_fields:
        raise HTTPException(status_code=422, detail="Invalid sort field")

    if order not in ["asc", "desc"]:
        raise HTTPException(status_code=422, detail="Order must be 'asc' or 'desc'")

    sort_column = allowed_sort_fields[sort]
    query = query.order_by(
        sort_column.asc() if order == "asc" else sort_column.desc()
    )

    total = query.count()
    decisions = query.offset((page - 1) * page_size).limit(page_size).all()
    items = [DecisionListItem.model_validate(d) for d in decisions]

    return DecisionListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total
    )
@router.get(
    "/{decision_id}",
    response_model=DecisionResponse
)
def get_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = (
        db.query(Decision)
        .filter(Decision.id == decision_id)
        .first()
    )

    if decision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )
    return decision
@router.put(
    "/{decision_id}",
    response_model=DecisionResponse
)
def update_decision(
    decision_id: int,
    decision_data: DecisionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = (
        db.query(Decision)
        .filter(Decision.id == decision_id)
        .first()
    )

    if decision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )
    if decision.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this decision"
        )

    
    old_data = {
        "title": decision.title,
        "problem_statement": decision.problem_statement,
        "category": decision.category,
        "rationale": decision.rationale,
    }

    if decision_data.title is not None:
        decision.title = decision_data.title
    if decision_data.problem_statement is not None:
        decision.problem_statement = decision_data.problem_statement
    if decision_data.category is not None:
        decision.category = decision_data.category
    if decision_data.rationale is not None:
        decision.rationale = decision_data.rationale
        log_activity(
        db,
        user_id=current_user.id,
        action="decision_updated",
        entity_type="decision",
        entity_id=decision.id,
        description=f"User {current_user.id} updated Decision {decision.id}"
    )

    log_audit(
        db,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="Decision",
        entity_id=decision.id,
        description=f"User {current_user.id} updated Decision {decision.id}",
        old_value=old_data,
        new_value={
            "title": decision.title,
            "problem_statement": decision.problem_statement,
            "category": decision.category,
            "rationale": decision.rationale,
        },
    )

    db.commit()
    db.refresh(decision)

    return decision
@router.post(
    "/{decision_id}/submit",
    response_model=DecisionResponse
)
def submit_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = (
        db.query(Decision)
        .filter(Decision.id == decision_id)
        .first()
    )

    if decision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )

    allowed_roles = ["Administrator", "Admin", "Manager", "Reviewer"]
    if decision.created_by != current_user.id and current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to submit this decision"
        )

    if decision.status not in ["Draft", "Rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Draft or Rejected decisions can be submitted for review"
        )

    decision.status = "Under Review"

    log_activity(
        db,
        user_id=current_user.id,
        action="decision_submitted",
        entity_type="decision",
        entity_id=decision.id,
        description=f"User {current_user.id} ({current_user.role}) submitted Decision {decision.id} for review"
    )

    log_audit(
        db,
        user_id=current_user.id,
        action="SUBMIT",
        entity_type="Decision",
        entity_id=decision.id,
        description=f"User {current_user.id} ({current_user.role}) submitted Decision {decision.id} for review",
        old_value={"status": "Draft"},
        new_value={"status": "Under Review"},
    )

    db.commit()
    db.refresh(decision)

    return decision


@router.post(
    "/{decision_id}/verdict",
    response_model=DecisionResponse
)
def submit_decision_verdict(
    decision_id: int,
    verdict_data: DecisionVerdictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = (
        db.query(Decision)
        .filter(Decision.id == decision_id)
        .first()
    )

    if decision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )

    target_status = (verdict_data.status or "").strip()
    valid_statuses = ["Approved", "Rejected", "Under Review", "Draft"]
    if target_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target status '{target_status}'. Must be one of {valid_statuses}"
        )

    user_role = (current_user.role or "").strip()
    is_mgmt = user_role in ["Administrator", "Admin", "Manager"]
    is_rev = user_role == "Reviewer"
    is_creator = decision.created_by == current_user.id

    if target_status in ["Approved", "Rejected"]:
        if not (is_mgmt or is_rev):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Manager, Reviewer, or Administrator access required to record verdict"
            )
    elif target_status in ["Under Review", "Draft"]:
        if not (is_creator or is_mgmt or is_rev):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to change decision review status"
            )

    old_status = decision.status
    decision.status = target_status

    now = datetime.now(timezone.utc)
    comments = (verdict_data.comments or "").strip() or f"Decision status updated to {target_status} by {user_role} User #{current_user.id}"

    if target_status in ["Approved", "Rejected"]:
        pending_appr = (
            db.query(Approval)
            .filter(Approval.decision_id == decision_id, Approval.status == "Pending")
            .order_by(Approval.assigned_at.desc())
            .first()
        )
        if pending_appr:
            pending_appr.status = target_status
            pending_appr.comments = comments
            pending_appr.completed_at = now
            if is_mgmt and pending_appr.approval_level < 2 and target_status == "Approved":
                pending_appr.approval_level = 2
        else:
            level = verdict_data.approval_level or (2 if is_mgmt else 1)
            approval = Approval(
                decision_id=decision_id,
                reviewer_id=current_user.id,
                approval_level=level,
                status=target_status,
                assigned_at=now,
                completed_at=now,
                comments=comments
            )
            db.add(approval)

    log_activity(
        db,
        user_id=current_user.id,
        action=f"decision_{target_status.lower().replace(' ', '_')}",
        entity_type="decision",
        entity_id=decision.id,
        description=f"User {current_user.id} ({user_role}) updated Decision {decision.id} status to {target_status}: {comments}"
    )

    log_audit(
        db,
        user_id=current_user.id,
        action="VERDICT",
        entity_type="Decision",
        entity_id=decision.id,
        description=f"Governance verdict {target_status}: {comments}",
        old_value={"status": old_status},
        new_value={"status": target_status, "comments": comments}
    )

    db.commit()
    db.refresh(decision)

    return decision

@router.post(
    "/{decision_id}/tags",
    response_model=List[TagResponse]
)
def assign_tags_to_decision(
    decision_id: int,
    tag_data: TagAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = (
        db.query(Decision)
        .filter(Decision.id == decision_id)
        .first()
    )

    if decision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )
    tags = db.query(Tag).filter(Tag.id.in_(tag_data.tag_ids)).all()
    found_tag_ids = {tag.id for tag in tags}
    missing_tag_ids = set(tag_data.tag_ids) - found_tag_ids

    if missing_tag_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tag(s) not found: {sorted(missing_tag_ids)}"
        )

    existing_tag_ids = {tag.id for tag in decision.tags}
    for tag in tags:
        if tag.id not in existing_tag_ids:
            decision.tags.append(tag)

    db.commit()
    db.refresh(decision)

    return decision.tags


@router.delete(
    "/{decision_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = (
        db.query(Decision)
        .filter(Decision.id == decision_id)
        .first()
    )

    if decision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )

    user_role = (current_user.role or "").strip().lower()
    is_admin = user_role in ("administrator", "admin")
    is_creator = decision.created_by == current_user.id

    if not is_admin and not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this decision"
        )

    if not is_admin and decision.status not in ("Draft", "Rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete decision with status '{decision.status}'. Only Draft or Rejected decisions can be deleted by creators."
        )

    old_data = {
        "title": decision.title,
        "category": decision.category,
        "status": decision.status,
    }

    log_activity(
        db,
        user_id=current_user.id,
        action="decision_deleted",
        entity_type="decision",
        entity_id=decision.id,
        description=f"User {current_user.id} deleted Decision {decision.id}"
    )

    log_audit(
        db,
        user_id=current_user.id,
        action="DELETE",
        entity_type="Decision",
        entity_id=decision.id,
        description=f"User {current_user.id} deleted Decision {decision.id}",
        old_value=old_data,
    )

    db.delete(decision)
    db.commit()

    return None