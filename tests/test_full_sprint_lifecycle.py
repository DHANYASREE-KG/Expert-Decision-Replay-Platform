# pyrefly: ignore [missing-import]
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.tag import Tag


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Seed core users with distinct roles
    with TestingSessionLocal() as db:
        admin_user = User(
            id=1,
            full_name="Admin Director",
            email="admin@platform.com",
            role="Administrator",
            employee_id="ADM-001",
            department="Executive",
            designation="CTO",
            phone_number="+1-555-0100",
            password=hash_password("Pass1234"),
        )
        manager_user = User(
            id=2,
            full_name="Team Manager",
            email="manager@platform.com",
            role="Manager",
            employee_id="MGR-001",
            department="Engineering",
            designation="Engineering Lead",
            phone_number="+1-555-0200",
            password=hash_password("Pass1234"),
        )
        reviewer_user = User(
            id=3,
            full_name="Architecture Reviewer",
            email="reviewer@platform.com",
            role="Reviewer",
            employee_id="REV-001",
            department="Architecture",
            designation="Principal Architect",
            phone_number="+1-555-0300",
            password=hash_password("Pass1234"),
        )
        employee_user = User(
            id=4,
            full_name="Software Developer",
            email="employee@platform.com",
            role="Employee",
            employee_id="DEV-001",
            department="Engineering",
            designation="Senior Engineer",
            phone_number="+1-555-0400",
            password=hash_password("Pass1234"),
        )
        db.add_all([admin_user, manager_user, reviewer_user, employee_user])

        team = Team(id=1, name="Core Architecture Team", department="Engineering")
        db.add(team)
        db.flush()

        db.add_all([
            TeamMember(team_id=1, user_id=2),
            TeamMember(team_id=1, user_id=4),
        ])

        db.add_all([
            Tag(id=1, name="PostgreSQL"),
            Tag(id=2, name="Architecture"),
            Tag(id=3, name="Cloud"),
        ])
        db.commit()

    yield TestClient(app)
    app.dependency_overrides.clear()


def get_token(client, email, password="Pass1234"):
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


def test_end_to_end_sprint_lifecycle(client):
    print("\n=== STARTING END-TO-END SPRINT 1-14 INTEGRATION LIFECYCLE TEST ===")

    # 1. Authentication & JWT Tokens for All Roles
    admin_token = get_token(client, "admin@platform.com")
    manager_token = get_token(client, "manager@platform.com")
    reviewer_token = get_token(client, "reviewer@platform.com")
    employee_token = get_token(client, "employee@platform.com")

    emp_headers = {"Authorization": f"Bearer {employee_token}"}
    rev_headers = {"Authorization": f"Bearer {reviewer_token}"}
    mgr_headers = {"Authorization": f"Bearer {manager_token}"}
    adm_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Decision Creation (Protected API, Employee creates Decision)
    # Unauthenticated should fail with 401
    unauth_res = client.post("/decisions", json={"title": "Test", "problem_statement": "Problem", "category": "Technology"})
    assert unauth_res.status_code == 401

    dec_res = client.post(
        "/decisions",
        json={
            "title": "Adopt PostgreSQL for Decision Persistence",
            "problem_statement": "Need robust relational ACID guarantees, JSONB query capabilities, and foreign keys.",
            "category": "Technology"
        },
        headers=emp_headers
    )
    assert dec_res.status_code == 201
    decision = dec_res.json()
    decision_id = decision["id"]
    assert decision["status"] == "Draft"
    assert decision["created_by"] == 4
    print(f"Step 1 PASSED: Created Decision #{decision_id} (Status: {decision['status']}, Creator: {decision['created_by']})")

    # 3. Alternative Analysis (3 options, validation checks)
    alt1_res = client.post(
        f"/decisions/{decision_id}/alternatives",
        json={
            "name": "PostgreSQL 16",
            "description": "Enterprise-grade open-source relational database",
            "pros": "ACID compliance, JSONB support, mature ecosystem",
            "cons": "Requires connection pooling setup",
            "estimated_cost": 4500.0,
            "feasibility_score": 5,
            "risk_level": "Low"
        },
        headers=emp_headers
    )
    assert alt1_res.status_code == 201

    alt2_res = client.post(
        f"/decisions/{decision_id}/alternatives",
        json={
            "name": "MongoDB Cluster",
            "description": "Document store with horizontal sharding",
            "pros": "Schemaless flexibility",
            "cons": "Weaker multi-table relational joins",
            "estimated_cost": 7500.0,
            "feasibility_score": 3,
            "risk_level": "Medium"
        },
        headers=emp_headers
    )
    assert alt2_res.status_code == 201

    # Feasibility Validation (0 or >5 should fail with 422)
    invalid_feasibility = client.post(
        f"/decisions/{decision_id}/alternatives",
        json={
            "name": "Invalid DB",
            "description": "Bad feasibility score",
            "estimated_cost": 1000.0,
            "feasibility_score": 9,
            "risk_level": "Low"
        },
        headers=emp_headers
    )
    assert invalid_feasibility.status_code == 422

    # Compare Alternatives API
    compare_res = client.get(f"/decisions/{decision_id}/alternatives/compare", headers=emp_headers)
    assert compare_res.status_code == 200
    compare_data = compare_res.json()
    assert len(compare_data["alternatives"]) == 2
    print(f"Step 2 PASSED: Added alternatives & verified comparison for Decision #{decision_id}")

    # 4. Collaboration: Discussion Threads, Comments, Meeting Notes, Rationale
    thread_res = client.post(
        f"/decisions/{decision_id}/threads",
        json={
            "title": "Evaluating PostgreSQL vs MongoDB JSON storage",
            "description": "Need feedback on whether PostgreSQL JSONB meets our audit query performance."
        },
        headers=emp_headers
    )
    assert thread_res.status_code == 201
    thread_id = thread_res.json()["id"]

    comment_res = client.post(
        f"/threads/{thread_id}/comments",
        json={"content": "Benchmarking confirms PostgreSQL GIN indexes on JSONB outperform document stores."},
        headers=rev_headers
    )
    assert comment_res.status_code == 201

    note_res = client.post(
        f"/decisions/{decision_id}/meeting-notes",
        json={
            "title": "Architecture Sync: Database Selection",
            "content": "Consensus reached to standardize on PostgreSQL across all core microservices."
        },
        headers=emp_headers
    )
    assert note_res.status_code == 201

    rat_res = client.put(
        f"/decisions/{decision_id}/rationale",
        json={"rationale": "PostgreSQL provides highest reliability, native ACID safety, and lowest TCO."},
        headers=emp_headers
    )
    assert rat_res.status_code == 200
    print(f"Step 3 PASSED: Recorded threads, comments, meeting notes, and rationale.")

    # 5. Tag Management
    tag_assoc = client.post(
        f"/decisions/{decision_id}/tags",
        json={"tag_ids": [1, 2]},
        headers=emp_headers
    )
    assert tag_assoc.status_code == 200
    print(f"Step 4 PASSED: Associated tags [PostgreSQL, Architecture] with Decision #{decision_id}")

    # 6. Workflow Transition: Submit for Review (Draft -> Under Review)
    submit_res = client.post(f"/decisions/{decision_id}/submit", headers=emp_headers)
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "Under Review"

    # 7. Approvals: Manager assigns Reviewer, Reviewer approves
    assign_res = client.post(
        "/approvals",
        json={"decision_id": decision_id, "reviewer_id": 3, "approval_level": 1},
        headers=mgr_headers
    )
    assert assign_res.status_code == 201
    appr_id = assign_res.json()["id"]

    # Reviewer approves
    act_res = client.patch(
        f"/approvals/{appr_id}",
        json={"status": "Approved", "comments": "Architecture design looks sound and meets security standards."},
        headers=rev_headers
    )
    assert act_res.status_code == 200
    print(f"Step 5 PASSED: Manager assigned & Reviewer approved Approval #{appr_id}")

    # 8. Decision Timeline & History
    timeline_res = client.get(f"/decisions/{decision_id}/timeline", headers=emp_headers)
    assert timeline_res.status_code == 200
    timeline_events = timeline_res.json()
    assert len(timeline_events) > 0

    history_res = client.get(f"/decisions/{decision_id}/history", headers=emp_headers)
    assert history_res.status_code == 200
    print(f"Step 6 PASSED: Retrieved decision timeline ({len(timeline_events)} events) and version history.")

    # 9. Knowledge Repository Search & Filtering
    search_res = client.get("/decisions/search?q=PostgreSQL", headers=emp_headers)
    assert search_res.status_code == 200
    assert len(search_res.json()["items"]) > 0

    cat_res = client.get("/decisions?category=Technology", headers=emp_headers)
    assert cat_res.status_code == 200
    print(f"Step 7 PASSED: Knowledge Repository search and category filter returned matching results.")

    # 10. Role-Based Dashboards
    emp_dash = client.get("/dashboard/employee", headers=emp_headers)
    assert emp_dash.status_code == 200

    mgr_dash = client.get("/dashboard/manager", headers=mgr_headers)
    assert mgr_dash.status_code == 200

    adm_dash = client.get("/dashboard/admin", headers=adm_headers)
    assert adm_dash.status_code == 200

    # Authorization check: Employee accessing Admin dashboard should return 403
    unauth_dash = client.get("/dashboard/admin", headers=emp_headers)
    assert unauth_dash.status_code == 403
    print(f"Step 8 PASSED: Role-based dashboards verified (Employee, Manager, Admin, 403 RBAC).")

    # 11. Audit & Security Activity Logs
    audit_res = client.get("/audit-logs", headers=adm_headers)
    assert audit_res.status_code == 200
    assert audit_res.json()["total"] > 0

    sec_res = client.get("/audit-logs/security", headers=adm_headers)
    assert sec_res.status_code == 200

    # Non-admin cannot view system audit logs (403)
    emp_audit = client.get("/audit-logs", headers=emp_headers)
    assert emp_audit.status_code == 403
    print(f"Step 9 PASSED: System audit logs and security logs verified with RBAC.")

    # 12. Reports & File Exports (PDF and Excel)
    rep_dec = client.get("/reports/decisions", headers=adm_headers)
    assert rep_dec.status_code == 200

    # PDF Export
    pdf_res = client.get("/reports/decisions/export/pdf", headers=adm_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 100

    # Excel Export
    excel_res = client.get("/reports/decisions/export/excel", headers=adm_headers)
    assert excel_res.status_code == 200
    assert "spreadsheet" in excel_res.headers["content-type"]
    assert len(excel_res.content) > 100
    print(f"Step 10 PASSED: Generated Decision Reports and exported valid PDF ({len(pdf_res.content)} bytes) and Excel ({len(excel_res.content)} bytes).")

    print("=== END-TO-END SPRINT 1-14 INTEGRATION LIFECYCLE TEST COMPLETED SUCCESSFULLY! ===\n")
