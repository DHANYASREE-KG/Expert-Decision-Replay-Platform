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
from app.routers import AUTH_ROUTER, DECISION_ROUTER, USER_ROUTER


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
        db.add(
            User(
                full_name="Test User",
                email="test@example.com",
                role="Employee",
                employee_id="E100",
                department="IT",
                designation="Developer",
                phone_number="1234567890",
                password=hash_password("Pass1234"),
            )
        )
        db.commit()

    yield TestClient(app)
    app.dependency_overrides.clear()


def test_canonical_router_registry():
    assert AUTH_ROUTER is not None
    assert USER_ROUTER is not None
    assert DECISION_ROUTER is not None


def test_user_login_and_auth_flow(client):
    register_response = client.post(
        "/users",
        json={
            "full_name": "New User",
            "email": "new@example.com",
            "role": "Employee",
            "employee_id": "E101",
            "department": "IT",
            "designation": "Developer",
            "phone_number": "0987654321",
            "password": "Pass1234",
        },
    )
    assert register_response.status_code == 201

    success_response = client.post(
        "/users/login",
        json={"email": "test@example.com", "password": "Pass1234"},
    )
    assert success_response.status_code == 200
    token = success_response.json()["access_token"]
    assert token

    bad_response = client.post(
        "/users/login",
        json={"email": "test@example.com", "password": "wrongpass"},
    )
    assert bad_response.status_code == 401
