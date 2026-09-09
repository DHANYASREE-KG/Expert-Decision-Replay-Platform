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

    # Seed users across the 4 roles
    with TestingSessionLocal() as db:
        admin_user = User(
            id=1,
            full_name="System Administrator",
            email="admin@example.com",
            role="Administrator",
            employee_id="ADM-001",
            password=hash_password("Pass1234"),
        )
        manager_user = User(
            id=2,
            full_name="Sarah Connor",
            email="manager@example.com",
            role="Manager",
            employee_id="MGR-001",
            password=hash_password("Pass1234"),
        )
        reviewer_user = User(
            id=3,
            full_name="David Chen",
            email="reviewer@example.com",
            role="Reviewer",
            employee_id="REV-001",
            password=hash_password("Pass1234"),
        )
        employee_user = User(
            id=4,
            full_name="Alice Smith",
            email="employee@example.com",
            role="Employee",
            employee_id="EMP-001",
            password=hash_password("Pass1234"),
        )
        db.add_all([admin_user, manager_user, reviewer_user, employee_user])
        db.commit()

    yield TestClient(app)
    app.dependency_overrides.clear()


def test_auth_invalid_credentials_returns_401(client):
    # Non-existent user
    res = client.post("/auth/login", json={"email": "nonexistent@example.com", "password": "Pass1234"})
    assert res.status_code == 401
    assert "Invalid email/username or password" in res.json()["detail"]

    # Wrong password
    res = client.post("/auth/login", json={"email": "admin@example.com", "password": "WrongPassword!"})
    assert res.status_code == 401
    assert "Invalid email/username or password" in res.json()["detail"]


def test_auth_multi_identifier_login(client):
    # Login via Email
    res_email = client.post("/auth/login", json={"email": "admin@example.com", "password": "Pass1234"})
    assert res_email.status_code == 200
    assert "access_token" in res_email.json()

    # Login via Full Name
    res_name = client.post("/auth/login", json={"email": "Sarah Connor", "password": "Pass1234"})
    assert res_name.status_code == 200
    assert "access_token" in res_name.json()

    # Login via Employee ID
    res_empid = client.post("/auth/login", json={"email": "MGR-001", "password": "Pass1234"})
    assert res_empid.status_code == 200
    assert "access_token" in res_empid.json()


def test_auth_role_verification_prevents_manager_logging_in_as_admin(client):
    # Attempting to log into Admin with Manager credentials
    res = client.post("/auth/login", json={
        "email": "manager@example.com",
        "password": "Pass1234",
        "role": "Administrator"
    })
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]
    assert "Manager" in res.json()["detail"]
    assert "Administrator" in res.json()["detail"]

    # Attempting with Manager's name
    res_name = client.post("/auth/login", json={
        "email": "Sarah Connor",
        "password": "Pass1234",
        "role": "Administrator"
    })
    assert res_name.status_code == 403
    assert "Access denied" in res_name.json()["detail"]

    # Employee attempting to log in as Administrator
    res_emp = client.post("/auth/login", json={
        "email": "Alice Smith",
        "password": "Pass1234",
        "role": "Administrator"
    })
    assert res_emp.status_code == 403

    # Administrator logging in with Administrator role requirement succeeds
    res_adm = client.post("/auth/login", json={
        "email": "admin@example.com",
        "password": "Pass1234",
        "role": "Administrator"
    })
    assert res_adm.status_code == 200


def test_strict_rbac_endpoint_access(client):
    # Obtain tokens for each role
    adm_token = client.post("/auth/login", json={"email": "admin@example.com", "password": "Pass1234"}).json()["access_token"]
    mgr_token = client.post("/auth/login", json={"email": "manager@example.com", "password": "Pass1234"}).json()["access_token"]
    rev_token = client.post("/auth/login", json={"email": "reviewer@example.com", "password": "Pass1234"}).json()["access_token"]
    emp_token = client.post("/auth/login", json={"email": "employee@example.com", "password": "Pass1234"}).json()["access_token"]

    adm_headers = {"Authorization": f"Bearer {adm_token}"}
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    rev_headers = {"Authorization": f"Bearer {rev_token}"}
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # 1. Admin Dashboard (/dashboard/admin): Only Admin allowed
    assert client.get("/dashboard/admin", headers=adm_headers).status_code == 200
    assert client.get("/dashboard/admin", headers=mgr_headers).status_code == 403
    assert client.get("/dashboard/admin", headers=rev_headers).status_code == 403
    assert client.get("/dashboard/admin", headers=emp_headers).status_code == 403

    # 2. Audit Logs (/audit-logs): Only Admin allowed
    assert client.get("/audit-logs", headers=adm_headers).status_code == 200
    assert client.get("/audit-logs", headers=mgr_headers).status_code == 403
    assert client.get("/audit-logs", headers=rev_headers).status_code == 403
    assert client.get("/audit-logs", headers=emp_headers).status_code == 403

    # 3. Manager Dashboard (/dashboard/manager): Only Manager and Admin allowed
    assert client.get("/dashboard/manager", headers=adm_headers).status_code == 200
    assert client.get("/dashboard/manager", headers=mgr_headers).status_code == 200
    assert client.get("/dashboard/manager", headers=emp_headers).status_code == 403

    # 4. User Deletion: Non-admin cannot delete other users
    assert client.delete("/users/4", headers=mgr_headers).status_code == 403
    assert client.delete("/users/4", headers=emp_headers).status_code == 403
