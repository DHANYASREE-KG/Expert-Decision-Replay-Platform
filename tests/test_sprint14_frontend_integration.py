import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.decision import Decision
from app.models.user import User


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

    with TestingSessionLocal() as db:
        admin = User(
            id=1,
            full_name="Admin Director",
            email="admin@platform.com",
            role="Administrator",
            employee_id="ADM-001",
            password=hash_password("Pass1234"),
        )
        emp1 = User(
            id=2,
            full_name="Alice Developer",
            email="alice@platform.com",
            role="Employee",
            employee_id="DEV-001",
            password=hash_password("Pass1234"),
        )
        emp2 = User(
            id=3,
            full_name="Bob Developer",
            email="bob@platform.com",
            role="Employee",
            employee_id="DEV-002",
            password=hash_password("Pass1234"),
        )
        db.add_all([admin, emp1, emp2])

        # Create sample decisions
        dec1 = Decision(
            id=1,
            title="Draft Decision by Alice",
            problem_statement="Alice problem statement",
            category="Technology",
            status="Draft",
            created_by=2,
        )
        dec2 = Decision(
            id=2,
            title="Approved Decision by Alice",
            problem_statement="Alice approved decision",
            category="Infrastructure",
            status="Approved",
            created_by=2,
        )
        db.add_all([dec1, dec2])
        db.commit()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_delete_decision_permissions(client):
    alice_token = create_access_token({"sub": "2", "email": "alice@platform.com", "role": "Employee"})
    bob_token = create_access_token({"sub": "3", "email": "bob@platform.com", "role": "Employee"})
    admin_token = create_access_token({"sub": "1", "email": "admin@platform.com", "role": "Administrator"})

    # Bob cannot delete Alice's decision (403 Forbidden)
    res = client.delete("/decisions/1", headers={"Authorization": f"Bearer {bob_token}"})
    assert res.status_code == 403

    # Alice cannot delete her approved decision (400 Bad Request)
    res = client.delete("/decisions/2", headers={"Authorization": f"Bearer {alice_token}"})
    assert res.status_code == 400

    # Alice can delete her draft decision (204 No Content)
    res = client.delete("/decisions/1", headers={"Authorization": f"Bearer {alice_token}"})
    assert res.status_code == 204

    # Verify decision 1 is gone
    res = client.get("/decisions/1", headers={"Authorization": f"Bearer {alice_token}"})
    assert res.status_code == 404

    # Admin can delete approved decision (204 No Content)
    res = client.delete("/decisions/2", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 204


def test_frontend_routes_served(client):
    # Root route serves index.html
    res = client.get("/")
    assert res.status_code == 200
    assert "Expert Decision Replay" in res.text

    # Static css file served
    res = client.get("/static/styles.css")
    assert res.status_code == 200
    assert "--green" in res.text


def test_decision_tags_and_history_integration(client):
    alice_token = create_access_token({"sub": "2", "email": "alice@platform.com", "role": "Employee"})

    # 1. Create a tag
    tag_res = client.post("/tags", json={"name": "Kubernetes"}, headers={"Authorization": f"Bearer {alice_token}"})
    assert tag_res.status_code == 201
    tag_id = tag_res.json()["id"]

    # 2. Attach tag to decision
    attach_res = client.post(f"/decisions/2/tags", json={"tag_ids": [tag_id]}, headers={"Authorization": f"Bearer {alice_token}"})
    assert attach_res.status_code == 200
    tags = attach_res.json()
    assert any(t["name"] == "Kubernetes" for t in tags)

    # 3. Fetch decision and verify tags list is present
    dec_res = client.get("/decisions/2", headers={"Authorization": f"Bearer {alice_token}"})
    assert dec_res.status_code == 200
    data = dec_res.json()
    assert "tags" in data
    assert any(t["name"] == "Kubernetes" for t in data["tags"])

    # 4. Check history versions
    hist_res = client.get("/decisions/2/history", headers={"Authorization": f"Bearer {alice_token}"})
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert "history" in hist_data
    assert len(hist_data["history"]) >= 1
    assert "version_number" in hist_data["history"][0]


def test_search_and_dashboards_integration(client):
    alice_token = create_access_token({"sub": "2", "email": "alice@platform.com", "role": "Employee"})
    admin_token = create_access_token({"sub": "1", "email": "admin@platform.com", "role": "Administrator"})

    # Search with category and status
    res = client.get("/decisions/search?category=Infrastructure&status=Approved", headers={"Authorization": f"Bearer {alice_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1

    # Employee dashboard returns recent decisions
    dash_res = client.get("/dashboard/employee", headers={"Authorization": f"Bearer {alice_token}"})
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "recent_decisions" in dash_data
    assert "total_decisions" in dash_data

    # Admin dashboard
    admin_dash = client.get("/dashboard/admin", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_dash.status_code == 200
    assert "total_users" in admin_dash.json()


def test_reports_exports(client):
    admin_token = create_access_token({"sub": "1", "email": "admin@platform.com", "role": "Administrator"})

    # PDF export
    pdf_res = client.get("/reports/decisions/export/pdf", headers={"Authorization": f"Bearer {admin_token}"})
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 0

    # Excel export
    excel_res = client.get("/reports/decisions/export/excel", headers={"Authorization": f"Bearer {admin_token}"})
    assert excel_res.status_code == 200
    assert len(excel_res.content) > 0

