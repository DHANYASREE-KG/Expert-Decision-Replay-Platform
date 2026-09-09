from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.comment import Comment
from app.models.decision import Decision
from app.models.user import User
from app.models.discussion_thread import DiscussionThread
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.activity_service import log_activity
from app.services.audit_service import log_audit


router = APIRouter(
    tags=["Comments"]
)


# ---------------------------------------------------------
# CREATE COMMENT
# POST /threads/{thread_id}/comments
# ---------------------------------------------------------
@router.post(
    "/threads/{thread_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED
)
def create_thread_reply(
    thread_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    thread = (
        db.query(DiscussionThread)
        .filter(DiscussionThread.id == thread_id)
        .first()
    )

    if thread is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discussion thread not found"
        )

    new_comment = Comment(
        decision_id=thread.decision_id,
        thread_id=thread_id,
        user_id=current_user.id,
        content=comment_data.content
    )

    db.add(new_comment)
    db.flush()

    log_activity(
        db,
        user_id=current_user.id,
        action="comment_created",
        entity_type="comment",
        entity_id=new_comment.id,
        description=f"User {current_user.id} added Comment {new_comment.id}"
    )

    log_audit(
        db,
        user_id=current_user.id,
        action="CREATE",
        entity_type="Comment",
        entity_id=new_comment.id,
        description=f"User {current_user.id} created Comment {new_comment.id}",
        new_value={
            "thread_id": thread_id,
            "decision_id": thread.decision_id,
        },
    )

    db.commit()
    db.refresh(new_comment)

    return new_comment


# ---------------------------------------------------------
# GET COMMENTS FOR A THREAD
# GET /threads/{thread_id}/comments
# ---------------------------------------------------------
@router.get(
    "/threads/{thread_id}/comments",
    response_model=List[CommentResponse]
)
def get_thread_comments(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    thread = (
        db.query(DiscussionThread)
        .filter(DiscussionThread.id == thread_id)
        .first()
    )

    if thread is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discussion thread not found"
        )

    comments = (
        db.query(Comment)
        .filter(Comment.thread_id == thread_id)
        .order_by(Comment.created_at.asc())
        .all()
    )

    return comments


# ---------------------------------------------------------
# CREATE COMMENT FOR A DECISION
# POST /decisions/{decision_id}/comments
# ---------------------------------------------------------
@router.post(
    "/decisions/{decision_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED
)
def create_decision_comment(
    decision_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    if decision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )

    new_comment = Comment(
        decision_id=decision_id,
        user_id=current_user.id,
        content=comment_data.content
    )

    db.add(new_comment)
    db.flush()

    log_activity(
        db,
        user_id=current_user.id,
        action="comment_created",
        entity_type="comment",
        entity_id=new_comment.id,
        description=f"User {current_user.id} added comment to Decision {decision_id}"
    )

    log_audit(
        db,
        user_id=current_user.id,
        action="CREATE",
        entity_type="Comment",
        entity_id=new_comment.id,
        description=f"User {current_user.id} created Comment {new_comment.id} on Decision {decision_id}",
        new_value={"decision_id": decision_id, "content": comment_data.content},
    )

    db.commit()
    db.refresh(new_comment)
    return new_comment


# ---------------------------------------------------------
# GET COMMENTS FOR A DECISION
# GET /decisions/{decision_id}/comments
# ---------------------------------------------------------
@router.get(
    "/decisions/{decision_id}/comments",
    response_model=List[CommentResponse]
)
def get_decision_comments(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = db.query(Decision).filter(Decision.id == decision_id).first()
    if decision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision not found"
        )

    comments = (
        db.query(Comment)
        .filter(Comment.decision_id == decision_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return comments


# ---------------------------------------------------------
# GET COMMENT BY ID
# GET /comments/{comment_id}
# ---------------------------------------------------------
@router.get(
    "/comments/{comment_id}",
    response_model=CommentResponse
)
def get_comment_by_id(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    return comment


# ---------------------------------------------------------
# UPDATE COMMENT
# PUT /comments/{comment_id}
# ---------------------------------------------------------
@router.put(
    "/comments/{comment_id}",
    response_model=CommentResponse
)
def update_comment(
    comment_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    user_role = (current_user.role or "").strip()
    if comment.user_id != current_user.id and user_role not in ["Administrator", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this comment"
        )

    comment.content = comment_data.content
    db.commit()
    db.refresh(comment)
    return comment


# ---------------------------------------------------------
# DELETE COMMENT
# DELETE /comments/{comment_id}
# ---------------------------------------------------------
@router.delete(
    "/comments/{comment_id}"
)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    user_role = (current_user.role or "").strip()
    if comment.user_id != current_user.id and user_role not in ["Administrator", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this comment"
        )

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted successfully"}