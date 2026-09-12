# Expert Decision Replay Platform

An enterprise-grade **Decision Intelligence & Knowledge Replay Platform** designed to capture, evaluate, approve, and audit organizational architectural decisions. The platform preserves the complete lifecycle of critical technology and business choices—from initial problem statements, alternatives analysis, and team discussions to multi-level governance approvals and immutable audit trails.

Built with **FastAPI**, **PostgreSQL**, **SQLAlchemy**, and a responsive, zero-build **Vanilla JavaScript (ES6+ Modules) + HTML5 + CSS3 + Bootstrap 5** web interface.

---

## Table of Contents

- [Key Highlights](#key-highlights)
- [Architecture Overview](#architecture-overview)
- [Project Directory Structure](#project-directory-structure)
- [Role-Based Access Control (RBAC) & Demo Accounts](#role-based-access-control-rbac--demo-accounts)
- [Decision Governance & Approval Workflow](#decision-governance--approval-workflow)
- [Prerequisites](#prerequisites)
- [Installation & Quickstart](#installation--quickstart)
- [Database Setup with PostgreSQL & Alembic](#database-setup-with-postgresql--alembic)
- [Automated Testing](#automated-testing)
- [API Reference](#api-reference)
- [Frontend Features](#frontend-features)
- [Security & Best Practices](#security--best-practices)
- [License](#license)

---

## Key Highlights

- **Complete Decision Lifecycle**: Draft $\rightarrow$ Under Review $\rightarrow$ Approved / Rejected $\rightarrow$ Deprecated.
- **Alternative Trade-Off Matrix**: Side-by-side comparison of options with pros, cons, estimated cost, and feasibility scoring.
- **Two-Tier Governance Approval**: Technical Reviewer peer evaluation (Level 1) + Managerial leadership ratification (Level 2).
- **Team Collaboration**: Threaded discussions, inline replies, and architectural sync meeting notes.
- **Enterprise Security**: Role-Based Access Control (RBAC), multi-identifier authentication (Email, Name, Employee ID), and bcrypt password hashing.
- **Compliance & Audit Trails**: Immutable system audit logs, security event tracking, and chronological decision version snapshots.
- **Reporting & Exports**: 1-click executive PDF and Excel (`.xlsx`) export generation.
- **Zero-Build Lightweight UI**: High-performance modular ES6 client served directly by FastAPI without `node_modules` or complex build tools.

---

## Architecture Overview

```mermaid
graph TD
    UI[Frontend Web UI: HTML5 / CSS3 / ES6 Modules / Bootstrap 5] -->|REST API / JWT| API[FastAPI Backend Server :8000]
    API -->|Auth & Security| Security[Security Layer: Bcrypt + PyJWT]
    API -->|ORM Layer| SQLAlchemy[SQLAlchemy Models & Engine]
    SQLAlchemy -->|Connection Pool| DB[(PostgreSQL Database :5432)]
    
    subgraph Core Functional Modules
        UM[User Management & RBAC]
        DM[Decision Replay & Versioning]
        AA[Alternative Trade-off Matrix]
        DT[Discussions & Meeting Notes]
        AP[Multi-Level Approvals Workflow]
        AL[Audit Trails & Security Logging]
        RP[PDF & Excel Export Services]
    end
    API --- CoreFunctionalModules
```

- **Backend**: Python 3.10+, FastAPI, SQLAlchemy ORM, Pydantic v2, PyJWT, Passlib (Bcrypt).
- **Frontend**: Modular Vanilla ES6 JavaScript (`frontend/js/`), CSS3 custom design tokens, Bootstrap 5.
- **Database**: PostgreSQL 13+ with foreign key cascades, unique constraints, and Alembic migrations.

---

## Project Directory Structure

```text
Expert-Decision-Replay-Platform/
│
├── app/                                # FastAPI backend application
│   ├── core/                           # Application configuration & security
│   │   ├── config.py                   # Environment settings (Pydantic BaseSettings)
│   │   ├── dependencies.py             # Route dependency injection & RBAC guards
│   │   └── security.py                 # JWT generation, decode, and Bcrypt hashing
│   ├── db/                             # Database engine and sessions
│   │   ├── base.py                     # Declarative Base
│   │   ├── database.py                 # SQLAlchemy engine & sessionmaker
│   │   └── session.py                  # get_db dependency provider
│   ├── models/                         # SQLAlchemy 16-table ORM models
│   │   ├── access_log.py               # Authentication & access tracking
│   │   ├── activity_log.py             # User activity logs
│   │   ├── alternative.py              # Architecture decision alternatives
│   │   ├── approval.py                 # Multi-level decision approvals
│   │   ├── audit_log.py                # System-wide audit trails
│   │   ├── comment.py                  # Thread & decision comments
│   │   ├── decision.py                 # Core decisions model
│   │   ├── decision_rationale.py       # Detailed rationale & justifications
│   │   ├── decision_tag.py             # Many-to-many tag associations
│   │   ├── decision_version.py         # Snapshot versions of decisions
│   │   ├── discussion_thread.py        # Team discussion threads
│   │   ├── meeting_note.py             # Architectural sync meeting notes
│   │   ├── security_log.py             # Security audit logs
│   │   ├── tag.py                      # Categorization tags
│   │   ├── team.py                     # Organizational teams
│   │   ├── team_member.py              # Team membership mappings
│   │   ├── user.py                     # User entity with professional profiles
│   │   └── __init__.py                 # Clean model exports
│   ├── routers/                        # Modular FastAPI REST API routes
│   │   ├── activities.py               # /activities endpoints
│   │   ├── alternative.py              # /decisions/{id}/alternatives endpoints
│   │   ├── approvals.py                # /approvals endpoints
│   │   ├── audit_logs.py               # /audit-logs endpoints
│   │   ├── auth.py                     # /auth/login and registration
│   │   ├── comment.py                  # /threads/{id}/comments endpoints
│   │   ├── dashboard.py                # Role-tailored dashboard analytics
│   │   ├── decision.py                 # /decisions CRUD, search, filter, and verdict
│   │   ├── decision_version.py         # /decisions/{id}/versions endpoints
│   │   ├── discussion_thread.py        # /threads endpoints
│   │   ├── meeting_notes.py            # /decisions/{id}/meeting-notes endpoints
│   │   ├── rationale.py                # /decisions/{id}/rationale endpoints
│   │   ├── reports.py                  # /reports (JSON, PDF, Excel)
│   │   ├── tags.py                     # /tags endpoints
│   │   ├── timeline.py                 # /decisions/{id}/timeline endpoints
│   │   └── user.py                     # /users full CRUD & profile endpoints
│   ├── schemas/                        # Pydantic v2 request & response schemas
│   ├── services/                       # Business logic & export generation
│   │   ├── activity_service.py         # Activity logging service
│   │   ├── audit_service.py            # Audit trail service
│   │   ├── dashboard_service.py        # KPI aggregations
│   │   ├── export_service.py           # PDF and Excel report generation
│   │   └── report_service.py           # Report data queries
│   └── main.py                         # Application entrypoint & static mount
│
├── frontend/                           # Pure client-side web application
│   ├── index.html                      # Single-page enterprise portal
│   ├── styles.css                      # Custom theme, glassmorphism & badges
│   ├── app.js                          # Application bootstrap entry point
│   ├── public/                         # Static icons & vector assets
│   └── js/                             # Modular ES6 JavaScript architecture
│       ├── api/                        # REST API client & error handler
│       ├── auth/                       # Client session & JWT state management
│       ├── components/                 # Reusable UI widgets (cards, modals, badges, toast)
│       ├── forms/                      # Form validations & sanitization
│       ├── layouts/                    # Navigation & responsive app shell
│       ├── pages/                      # Page controllers (dashboards, decisions, approvals, etc.)
│       └── router/                     # Client-side hash routing
│
├── tests/                              # Pytest automated test suite
│   ├── test_auth_and_rbac.py           # Authentication, multi-identifier login & RBAC tests
│   ├── test_core_flow.py               # Router registration and login flow tests
│   ├── test_full_sprint_lifecycle.py   # Complete end-to-end integration lifecycle suite
│   ├── test_sprint14_frontend_integration.py # Frontend integration, permissions & reports tests
│   └── test_user_management_crud.py    # User management CRUD & validation suite
│
├── requirements.txt                    # Python dependencies
├── alembic.ini                         # Alembic database migrations configuration
├── .env.example                        # Template for environment variables
└── README.md                           # Comprehensive documentation
```

---

## Role-Based Access Control (RBAC) & Demo Accounts

All pre-configured demo accounts use the standard demo password: **`Pass1234`**

| Role | Name | Email | Department | Designation | Permissions & Capabilities |
|---|---|---|---|---|---|
| **Administrator** | System Administrator | `admin@example.com` | Executive | CTO | Full system access: User Management CRUD, Admin Dashboard, Analytics, Audit & Security Logs, System Reports, Decisions. |
| **Manager** | Sarah Connor | `manager@example.com` | Engineering | Engineering Director | Team Decisions, Assign Reviewers, Level 2 Leadership Approval/Verdict, Manager Dashboard, Team Reports. |
| **Reviewer** | David Chen | `reviewer@example.com` | Architecture | Principal Architect | Approvals Queue, Level 1 Architecture Peer Review, Discussions, Meeting Notes, Decision Timeline. |
| **Employee** | Alice Smith | `employee@example.com` | Engineering | Senior Developer | Create Draft Decisions, Add Alternatives, Submit for Review, Participate in Discussions, Personal Dashboard. |

> **Flexible Authentication**: The login portal supports authentication via **Email Address** (e.g. `admin@example.com`), **Full Name** (e.g. `Sarah Connor`), or **Employee ID** (e.g. `MGR-001`). Role verification prevents privilege escalation attempts with HTTP `403 Forbidden`.

---

## Decision Governance & Approval Workflow

The platform implements a structured, multi-level governance process:

```mermaid
sequenceDiagram
    autonumber
    actor Emp as Employee / Creator
    actor Mgr as Manager
    actor Rev as Reviewer
    participant Sys as Decision Platform

    Emp->>Sys: 1. Create Decision (Status: Draft)
    Emp->>Sys: 2. Add Alternatives, Rationale, & Tags
    Emp->>Sys: 3. Submit Decision for Review (POST /decisions/{id}/submit)
    Note over Sys: Decision Status: Under Review
    Mgr->>Sys: 4. Assign Reviewer (POST /approvals, Level 1)
    Rev->>Sys: 5. Conduct Technical Review & Vote (PATCH /approvals/{id})
    alt Reviewer Rejects
        Note over Sys: Status immediately transitions to 'Rejected'
    else Reviewer Approves (Level 1)
        Note over Sys: Status remains 'Under Review' (Pending Leadership Sign-Off)
        Mgr->>Sys: 6. Leadership Ratification / Final Verdict (Level 2)
        Note over Sys: Decision Status: Approved
    end
```

1. **Submission**: The creator completes the initial trade-off analysis and submits the decision (`Draft` $\rightarrow$ `Under Review`).
2. **Reviewer Assignment**: A Manager assigns a designated technical Reviewer (`POST /approvals`).
3. **Level 1 Peer Review**: The Reviewer conducts an architectural assessment and votes `Approved` or `Rejected`. Approving at Level 1 keeps the decision in `Under Review` pending leadership sign-off.
4. **Level 2 Leadership Ratification**: The Manager reviews the technical evaluation and issues the final verdict (`Approved` or `Rejected`).
5. **Fail-Fast Rejection**: If either the Reviewer or Manager rejects the decision, it transitions immediately to `Rejected` with recorded feedback.

---

## Prerequisites

- **Python**: Version 3.10, 3.11, 3.12, 3.13, or 3.14.
- **PostgreSQL**: Version 13 or higher (or pgAdmin 4).
- **Web Browser**: Any modern browser (Chrome, Edge, Firefox, Safari).

---

## Installation & Quickstart

### 1. Clone or Open the Workspace
```powershell
cd Expert-Decision-Replay-Platform
```

### 2. Create and Activate a Virtual Environment
```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

### 3. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
APP_NAME=Expert Decision Replay Platform
DATABASE_URL=postgresql+psycopg2://postgres:your_password@localhost:5432/expert_decision_replay
SECRET_KEY=super-secret-decision-replay-jwt-key-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
```
*(Replace `your_password` with your local PostgreSQL password).*

### 5. Start the Application
```powershell
uvicorn app.main:app --reload --port 8000
```
Or with explicit virtual environment execution:
```powershell
$env:PYTHONPATH="."; .venv\Scripts\uvicorn.exe app.main:app --port 8000 --host 127.0.0.1
```

### 6. Access the Application & Interactive Docs
- **Web UI Portal**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## Database Setup with PostgreSQL & Alembic

### Step 1: Create the Database
Using **pgAdmin 4** or the PostgreSQL command line:
```sql
CREATE DATABASE expert_decision_replay;
```

### Step 2: Apply Database Migrations
Run the standard Alembic migration command from the project root:
```powershell
alembic upgrade head
```
This provisions all core tables:
- `users`, `teams`, `team_members`, `tags`, `decision_tags`
- `decisions`, `alternatives`, `discussion_threads`, `comments`, `meeting_notes`, `decision_versions`, `approvals`
- `activity_logs`, `audit_logs`, `security_logs`, `access_logs`, `alembic_version`

---

## Automated Testing

The automated test suite verifies all user management CRUD operations, authentication, RBAC constraints, governance lifecycles, and report exports.

Run all tests using `pytest`:
```powershell
$env:PYTHONPATH="."; .venv\Scripts\python.exe -m pytest -v
```

### Test Suite Summary:
```text
============================= test session starts =============================
collected 14 items

tests/test_auth_and_rbac.py::test_auth_invalid_credentials_returns_401 PASSED
tests/test_auth_and_rbac.py::test_auth_multi_identifier_login PASSED
tests/test_auth_and_rbac.py::test_auth_role_verification_prevents_manager_logging_in_as_admin PASSED
tests/test_auth_and_rbac.py::test_strict_rbac_endpoint_access PASSED
tests/test_auth_and_rbac.py::test_privileged_user_creation_rbac PASSED
tests/test_core_flow.py::test_canonical_router_registry PASSED
tests/test_core_flow.py::test_user_login_and_auth_flow PASSED
tests/test_full_sprint_lifecycle.py::test_end_to_end_sprint_lifecycle PASSED
tests/test_sprint14_frontend_integration.py::test_delete_decision_permissions PASSED
tests/test_sprint14_frontend_integration.py::test_frontend_routes_served PASSED
tests/test_sprint14_frontend_integration.py::test_decision_tags_and_history_integration PASSED
tests/test_sprint14_frontend_integration.py::test_search_and_dashboards_integration PASSED
tests/test_sprint14_frontend_integration.py::test_reports_exports PASSED
tests/test_user_management_crud.py::test_user_management_crud_six_scenarios PASSED

============================== 14 passed in 23.64s ==============================
```

---

## API Reference

### 1. Authentication (`/auth`)
- `POST /auth/login`: Authenticate with email, full name, or employee ID; returns Bearer JWT.
- `POST /auth/register`: User self-registration.

### 2. User Management (`/users`)
- `GET /users`: Retrieve users list (role & department filtering).
- `POST /users`: Create user (Administrator access required for privileged roles).
- `GET /users/{id}`: Retrieve user profile details.
- `PUT /users/{id}`: Update user profile, role, or contact info.
- `DELETE /users/{id}`: Remove user account (Admin only).

### 3. Decisions & Knowledge Replay (`/decisions`)
- `GET /decisions`: List decisions with status, category, and date range filters.
- `POST /decisions`: Create architectural decision (Draft).
- `GET /decisions/{id}`: Get full decision details, rationale, tags, and creator profile.
- `PUT /decisions/{id}`: Update decision metadata.
- `DELETE /decisions/{id}`: Delete draft decision (or Admin override).
- `POST /decisions/{id}/submit`: Transition draft decision to `Under Review`.
- `POST /decisions/{id}/verdict`: Leadership decision approval/rejection verdict.
- `GET /decisions/{id}/history`: Retrieve audit history snapshots.
- `GET /decisions/{id}/timeline`: Retrieve chronological timeline events.

### 4. Alternatives & Trade-Offs
- `GET /decisions/{decision_id}/alternatives`: Retrieve candidate architectures evaluated for a decision.
- `POST /decisions/{decision_id}/alternatives`: Add an alternative (pros, cons, cost, feasibility score, risk level).
- `GET /decisions/{decision_id}/alternatives/compare`: Side-by-side comparative trade-off matrix.

### 5. Discussions & Collaboration
- `GET /threads`: List discussion threads linked to decisions.
- `POST /decisions/{decision_id}/threads`: Create a discussion thread.
- `GET /threads/{thread_id}/comments`: Retrieve replies within a thread.
- `POST /threads/{thread_id}/comments`: Post a comment reply.
- `POST /decisions/{decision_id}/meeting-notes`: Record architecture sync meeting notes.

### 6. Multi-Level Approvals (`/approvals`)
- `GET /approvals`: List pending or completed approvals (filtered by reviewer or decision).
- `POST /approvals`: Manager assigns reviewer and sets approval level (Level 1 / Level 2).
- `PATCH /approvals/{id}`: Reviewer or Manager votes `Approved` or `Rejected` with comments.

### 7. Dashboards & Analytics (`/dashboard`)
- `GET /dashboard/employee`: Personal statistics, my decisions, pending submissions.
- `GET /dashboard/reviewer`: Assigned review queue and evaluation metrics.
- `GET /dashboard/manager`: Team decision metrics, pending approvals, and statistics.
- `GET /dashboard/admin`: System-wide user metrics, decision counts, and compliance health.

### 8. Reports & Exports (`/reports`)
- `GET /reports/decisions`: Decision distribution and summary report.
- `GET /reports/approvals`: Approval status report.
- `GET /reports/decisions/export/pdf`: Download formatted PDF decision summary report.
- `GET /reports/decisions/export/excel`: Download formatted Excel (`.xlsx`) decision report.

### 9. Audit & Security Activity
- `GET /audit-logs`: Query immutable system audit logs (Admin only).
- `GET /audit-logs/security`: Query security event logs (login attempts, access violations).
- `GET /activities`: Query user activity feed.

---

## Frontend Features

The web frontend located in `frontend/` provides a modern single-page application experience:

1. **Role-Based Workspaces**: Tailored dashboards for Administrator, Manager, Reviewer, and Employee.
2. **Quick-Switch Demo Profiles**: 1-click switcher to test different roles instantly.
3. **Decision Knowledge Repository**: Instant search, category filters, and status tags.
4. **Interactive Trade-Off Matrix**: Side-by-side alternative comparison highlighting cost, feasibility, and risks.
5. **Collaborative Discussions**: Live thread creation, nested comments, and architectural sync notes.
6. **Governance Approvals Queue**: Dedicated reviewer workspace to examine proposals, record architectural notes, and approve or reject decisions.
7. **User Management Interface**: Intuitive CRUD modals with client-side validation and feedback toasts.
8. **Executive Report Exports**: 1-click downloads for formatted PDF and Excel documents.
9. **Audit Log Explorer**: Searchable and filterable audit trail for governance and compliance inspection.

---

## Security & Best Practices

- **Bcrypt Password Hashing**: Passwords are securely hashed; never stored in plaintext.
- **JWT Authentication**: Industry-standard Bearer tokens with configurable expiration windows.
- **Strict Role-Based Access Control (RBAC)**: Enforced both at the API endpoint layer and in the UI navigation.
- **Relational Integrity**: Foreign keys with cascading rules prevent orphaned records.
- **Duplicate Prevention**: Unique database constraints on user `email` and `employee_id` with HTTP 409 Conflict handling.
- **Sanitized Static Serving**: Pure frontend assets served without vulnerable npm runtime dependencies.

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
