# Expert Decision Replay Platform

An enterprise-grade **Decision Intelligence & Knowledge Replay Platform** designed to capture, track, evaluate, and audit organizational architectural decisions. The platform preserves the full lifecycle of critical choices—from initial problem statements, alternatives analysis, and team discussions to multi-level approvals and immutable audit trails.

Built with **FastAPI**, **PostgreSQL**, **SQLAlchemy**, and a responsive, zero-build **Vanilla JavaScript + HTML5 + CSS3 + Bootstrap + TailwindCSS** web interface.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Directory Structure](#project-directory-structure)
- [Prerequisites](#prerequisites)
- [Database Setup with pgAdmin 4](#database-setup-with-pgadmin-4)
- [Installation & Quickstart](#installation--quickstart)
- [Pre-configured Demo Accounts](#pre-configured-demo-accounts)
- [User Management CRUD Scenarios (Task 28-07-2026)](#user-management-crud-scenarios-task-28-07-2026)
- [Automated Testing](#automated-testing)
- [API Reference](#api-reference)
- [Frontend Features](#frontend-features)

---

## Architecture Overview

```mermaid
graph TD
    UI[Pure Web UI: HTML5 / CSS3 / Vanilla JS / Bootstrap 5 / Tailwind] -->|HTTP / REST API| API[FastAPI Backend Server :8000]
    API -->|Auth & JWT| Security[Security & Password Hashing: Bcrypt + PyJWT]
    API -->|ORM Layer| SQLAlchemy[SQLAlchemy Models & Sessions]
    SQLAlchemy -->|Connection Pool| DB[(PostgreSQL Database :5432)]
    
    subgraph Core Modules
        UM[User Management CRUD]
        DM[Decision Lifecycle & Versioning]
        AA[Alternative Trade-off Matrix]
        DT[Discussion Threads & Comments]
        AP[Multi-Level Approvals]
        AL[Activity & Audit Trails]
        RP[Executive Reports - PDF & Excel]
    end
    API --- CoreModules
```

- **Backend**: Python 3.10+ / 3.14, FastAPI, SQLAlchemy ORM, Pydantic v2, python-jose / PyJWT, Passlib (Bcrypt).
- **Frontend**: Lightweight, high-performance pure client (zero `node_modules`, zero npm build pipelines required). Served directly by FastAPI static files.
- **Database**: PostgreSQL 14+ with strict relational integrity, foreign key cascades, and timestamp triggers.

---

## Project Directory Structure

```text
Expert-Decision-Replay-Platform/
│
├── app/                                # FastAPI backend application
│   ├── core/                           # Application configuration & security
│   │   ├── config.py                   # Environment settings (Pydantic BaseSettings)
│   │   ├── dependencies.py             # Route dependency injection
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
│   │   ├── decision.py                 # /decisions CRUD and filter endpoints
│   │   ├── decision_version.py         # /decisions/{id}/versions endpoints
│   │   ├── discussion_thread.py        # /threads endpoints
│   │   ├── meeting_notes.py            # /decisions/{id}/meeting-notes endpoints
│   │   ├── rationale.py                # /decisions/{id}/rationale endpoints
│   │   ├── reports.py                  # /reports (JSON, PDF, Excel)
│   │   ├── tags.py                     # /tags endpoints
│   │   ├── timeline.py                 # /decisions/{id}/timeline endpoints
│   │   └── user.py                     # /users full CRUD (Scenarios 1-6)
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
│   ├── app.js                          # SPA router, API client & dynamic DOM
│   └── public/                         # Static icons & vector assets
│
├── tests/                              # Pytest test suite
│   ├── test_core_flow.py               # Authentication & route registry tests
│   ├── test_full_sprint_lifecycle.py   # Complete 14-Sprint End-to-End integration suite
│   └── test_user_management_crud.py    # 6-Scenario User Management test suite
│
├── requirements.txt                    # Python dependencies
├── alembic.ini                         # Alembic database migrations configuration
├── .env.example                        # Template for environment variables
└── README.md                           # Comprehensive documentation

```

---

## Prerequisites

- **Python**: Version 3.10, 3.11, 3.12, 3.13, or 3.14.
- **PostgreSQL**: Version 13 or higher (or pgAdmin 4).
- **Web Browser**: Chrome, Edge, Firefox, or Safari (modern evergreen browsers).

---

## Database Setup with pgAdmin 4

The database can be configured in minutes using pgAdmin 4 or the `psql` command line:

### Step 1: Create Database in pgAdmin 4
1. Open **pgAdmin 4** and connect to your local PostgreSQL server.
2. In the Object Browser, right-click **Databases** > **Create** > **Database...**.
3. Set **Database** name to: `expert_decision_replay`.
4. Click **Save**.

### Step 2: Apply Database Migrations with Alembic
Run the standard Alembic migration command from the project root:
```powershell
alembic upgrade head
```
This automatically provisions all relational tables directly in PostgreSQL:
- `users`, `teams`, `team_members`, `tags`, `decision_tags`
- `decisions`, `alternatives`, `discussion_threads`, `comments`, `meeting_notes`, `decision_versions`, `approvals`, `decision_documents`
- `activity_logs`, `audit_logs`, `security_logs`, `access_logs`, `alembic_version`

### Step 3: Verify in pgAdmin 4
1. In pgAdmin 4, navigate to:
   `Databases` > `expert_decision_replay` > `Schemas` > `public` > `Tables`.
2. Right-click **Tables** and select **Refresh**.
3. You will see all tables including `users` and `alembic_version`.


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
Create or verify your `.env` file in the root directory:
```env
APP_NAME=Expert Decision Replay Platform
DATABASE_URL=postgresql+psycopg2://postgres:your_password@localhost:5432/expert_decision_replay
SECRET_KEY=super-secret-decision-replay-jwt-key-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
```
*(Replace `your_password` with your local PostgreSQL `postgres` password).*

### 5. Start the Application
Run Uvicorn to start the backend and static web server:
```powershell
uvicorn app.main:app --reload --port 8000
```
Or with explicit Python path:
```powershell
$env:PYTHONPATH="."; .venv\Scripts\uvicorn.exe app.main:app --port 8000 --host 127.0.0.1
```

### 6. Access the Web Portal & Interactive APIs
- **Web UI Application**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## Pre-configured Demo Accounts & Role-Based Access Control (RBAC)

All demo accounts use the standard demo password: **`Pass1234`**

| Role | Name | Email | Department | Designation | Allowed Access & Capabilities |
|---|---|---|---|---|---|
| **Administrator** | System Administrator | `admin@example.com` | Executive | CTO | Full System: User Management CRUD, Admin Dashboard, Analytics, Audit & Compliance Activity, Reports, Decisions |
| **Manager** | Sarah Connor | `manager@example.com` | Engineering | Engineering Director | Manager Dashboard, Decisions, Create Approval Requests (assign reviewers), Decision & Team Reports |
| **Reviewer** | David Chen | `reviewer@example.com` | Architecture | Principal Architect | Approvals Queue (Approve / Reject assigned decisions), Decisions, Discussions, Timeline |
| **Employee** | Alice Smith | `employee@example.com` | Engineering | Senior Developer | Employee Dashboard, Create Draft Decisions, Add Alternatives, Discussions |

> **Authentication & Security**: The login screen supports authentication via **Email Address** (e.g. `admin@example.com`) or **Full Name** (e.g. `Sarah Connor`). Users can optionally select a target role to strictly verify authorization on login. Attempting to log into an Administrator session with a non-admin account is immediately rejected with HTTP `403 Forbidden`.

---

## User Management CRUD Scenarios (Task 28-07-2026)

The User Management module strictly addresses the 6 assigned test scenarios:

| # | Scenario | Tested Action | Expected Result | Status |
|---|---|---|---|---|
| **1** | **Create 5+ New Users** | `POST /users` for 5 distinct accounts across multiple roles & departments | HTTP `201 Created` with created user objects & unique IDs | **PASSED** |
| **2** | **Retrieve Users** | `GET /users` and `GET /users/{id}` | HTTP `200 OK` returning users list and individual profile | **PASSED** |
| **3** | **Update 2 Existing Users** | `PUT /users/{id}` modifying designation, phone, and role | HTTP `200 OK` with updated fields reflected in DB | **PASSED** |
| **4** | **Delete 1 User** | `DELETE /users/{id}` on an existing test user | HTTP `200 OK` with confirmation message | **PASSED** |
| **5** | **Retrieve Deleted User** | `GET /users/{deleted_id}` | HTTP `404 Not Found` with `"User not found"` | **PASSED** |
| **6** | **Duplicate ID / Conflict** | `POST /users` attempting to reuse an existing `id` or `email` | HTTP `409 Conflict` preventing duplicate record | **PASSED** |

---

## Automated Testing

Run the automated test suite using `pytest`:

```powershell
$env:PYTHONPATH="."; .venv\Scripts\python.exe -m pytest -v
```

### Test Suite Output:
```text
============================= test session starts =============================
platform win32 -- Python 3.14.2, pytest-9.1.1, pluggy-1.6.0
collected 4 items

tests/test_core_flow.py::test_canonical_router_registry PASSED           [ 25%]
tests/test_core_flow.py::test_user_login_and_auth_flow PASSED            [ 50%]
tests/test_full_sprint_lifecycle.py::test_end_to_end_sprint_lifecycle PASSED [ 75%]
tests/test_user_management_crud.py::test_user_management_crud_six_scenarios PASSED [100%]

============================== 4 passed in 7.91s ==============================
```

All 6 User Management CRUD scenarios and authentication flows pass with 100% success.

---

## API Reference

### 1. Authentication
- `POST /auth/login`: Authenticate with email & password, returns Bearer JWT.
- `POST /auth/register`: Self-registration endpoint.

### 2. User Management (`/users`)
- `POST /users`: Create user (supports custom ID, employee ID, department, designation, role). Returns `409 Conflict` on duplicates.
- `GET /users`: Retrieve list of all users.
- `GET /users/{id}`: Retrieve specific user profile. Returns `404 Not Found` if deleted/missing.
- `PUT /users/{id}`: Update user fields (full_name, role, department, designation, phone_number, password).
- `DELETE /users/{id}`: Remove user from system.

### 3. Decisions & Knowledge Replay (`/decisions`)
- `GET /decisions`: List decisions with status, category, priority, and date range filters.
- `POST /decisions`: Create architectural decision.
- `GET /decisions/{id}`: Get decision details, including rationale, tags, and creator.
- `PUT /decisions/{id}`: Update decision metadata.
- `PATCH /decisions/{id}/status`: Update decision lifecycle status (`Draft`, `Under Review`, `Approved`, `Rejected`, `Deprecated`).
- `GET /decisions/{id}/versions`: Get version history snapshots.
- `GET /decisions/{id}/timeline`: Get chronological timeline events.

### 4. Alternatives & Trade-Off Matrix
- `GET /decisions/{decision_id}/alternatives`: Retrieve all candidate architectures/technologies evaluated for a decision.
- `POST /decisions/{decision_id}/alternatives`: Add an alternative with pros, cons, estimated cost, and risk score.

### 5. Discussion Threads & Comments
- `GET /threads`: List discussion threads.
- `POST /threads`: Start a thread linked to a decision.
- `GET /threads/{thread_id}/comments`: Retrieve comment replies in a thread.
- `POST /threads/{thread_id}/comments`: Post a comment reply.

### 6. Multi-Level Approvals (`/approvals`)
- `GET /approvals`: List pending or completed approvals.
- `POST /approvals`: Request approval for a decision with specified level and reviewer.
- `PUT /approvals/{id}`: Reviewer approves or rejects decision with comments.

### 7. Reports & Analytics (`/reports`)
- `GET /reports/decisions`: Decision distribution report.
- `GET /reports/approvals`: Approval status report.
- `GET /reports/approvals/pdf`: Download formatted PDF approval report.
- `GET /reports/approvals/excel`: Download formatted Excel (`.xlsx`) approval report.

### 8. Audit & Activity Logging
- `GET /audit-logs`: Query immutable system audit logs.
- `GET /activities`: Query user activity feed.

---

## Frontend Features

The web frontend located in `frontend/` provides an interactive, responsive experience:

1. **Quick-Switch Login**: Switch between Administrator, Manager, Reviewer, and Employee profiles in 1 click.
2. **User Management Dashboard**:
   - Live user table with role badges, department tags, and contact info.
   - **Add User Modal**: Create users with instant client & server validation.
   - **Edit User Modal**: Real-time update of roles, designations, and departments.
   - **Delete Action**: Safe deletion with visual feedback toasts.
3. **Decision Replay & Knowledge Base**:
   - Filter decisions by search query, status, and category.
   - View decision rationale, history, and timeline.
4. **Alternative Comparison Matrix**:
   - Side-by-side trade-off matrix comparing pros, cons, costs, and risk levels.
5. **Team Collaboration**:
   - Threaded discussions, live replies, and meeting notes viewer.
6. **Approval Workflow**:
   - Dedicated reviewer dashboard with single-click Approve / Reject actions and comment prompts.
7. **Reports & Exports**:
   - 1-click downloads for executive PDF and Excel reports.
8. **Compliance Audit Trail**:
   - Visual audit log inspector detailing who changed what and when.

---

## Security & Best Practices

- **Bcrypt Password Hashing**: Passwords are never stored in plaintext.
- **JWT Authentication**: Bearer tokens with configurable expiration windows.
- **Relational Integrity**: Foreign keys with cascading deletions where appropriate prevent orphaned data.
- **Duplicate Prevention**: Unique constraints on user `email` and `employee_id` with HTTP 409 Conflict handling.
- **Sanitized Static Serving**: Pure frontend assets served without vulnerable npm runtime dependencies.

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
