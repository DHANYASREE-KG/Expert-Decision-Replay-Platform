from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routers import (
    auth,
    user,
    decision,
    alternative,
    comment,
    discussion_thread,
    meeting_notes,
    rationale,
    tags,
    timeline,
    decision_version,
    dashboard,
    activities,
    audit_logs,
    reports,
)

app = FastAPI(
    title="Expert Decision Replay Platform"
)

frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(decision.router)
app.include_router(alternative.router)
app.include_router(comment.router)
app.include_router(discussion_thread.router)
app.include_router(meeting_notes.router)
app.include_router(rationale.router)
app.include_router(tags.router)
app.include_router(timeline.router)
app.include_router(decision_version.router)
app.include_router(dashboard.router)
app.include_router(activities.router)
app.include_router(audit_logs.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return FileResponse(frontend_dir / "index.html")