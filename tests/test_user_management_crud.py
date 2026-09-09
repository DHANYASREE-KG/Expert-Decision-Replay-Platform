import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_user_management_crud_six_scenarios():
    print("\n--- Starting User Management CRUD 6 Scenarios Test ---")

    # 1. Create at least 5 New Users
    users_to_create = [
        {
            "id": 101,
            "full_name": "Scenario User One",
            "email": "scenario1@testcorp.com",
            "role": "Employee",
            "employee_id": "SCEN-001",
            "department": "Engineering",
            "designation": "Software Engineer",
            "phone_number": "+1-555-1001",
            "password": "Password123"
        },
        {
            "id": 102,
            "full_name": "Scenario User Two",
            "email": "scenario2@testcorp.com",
            "role": "Reviewer",
            "employee_id": "SCEN-002",
            "department": "Quality Assurance",
            "designation": "QA Lead",
            "phone_number": "+1-555-1002",
            "password": "Password123"
        },
        {
            "id": 103,
            "full_name": "Scenario User Three",
            "email": "scenario3@testcorp.com",
            "role": "Manager",
            "employee_id": "SCEN-003",
            "department": "Product",
            "designation": "Product Director",
            "phone_number": "+1-555-1003",
            "password": "Password123"
        },
        {
            "id": 104,
            "full_name": "Scenario User Four",
            "email": "scenario4@testcorp.com",
            "role": "Administrator",
            "employee_id": "SCEN-004",
            "department": "Operations",
            "designation": "Operations Admin",
            "phone_number": "+1-555-1004",
            "password": "Password123"
        },
        {
            "id": 105,
            "full_name": "Scenario User Five",
            "email": "scenario5@testcorp.com",
            "role": "Employee",
            "employee_id": "SCEN-005",
            "department": "Security",
            "designation": "Security Analyst",
            "phone_number": "+1-555-1005",
            "password": "Password123"
        },
    ]

    created_ids = []
    for u in users_to_create:
        # Clean up in case already exists from previous runs
        client.delete(f"/users/{u['id']}")

        res = client.post("/users", json=u)
        assert res.status_code == 201, f"Failed to create user {u['email']}: {res.text}"
        data = res.json()
        assert data["email"] == u["email"]
        assert data["role"] == u["role"]
        created_ids.append(data["id"])
        print(f"Scenario 1 PASSED: Created user {data['full_name']} (ID: {data['id']}, Role: {data['role']})")

    assert len(created_ids) >= 5, "At least 5 users must be created"

    # 2. Retrieve users
    res = client.get("/users")
    assert res.status_code == 200, f"Failed to retrieve users: {res.text}"
    all_users = res.json()
    assert isinstance(all_users, list)
    assert len(all_users) >= 5
    retrieved_ids = [u["id"] for u in all_users]
    for uid in created_ids:
        assert uid in retrieved_ids
    print(f"Scenario 2 PASSED: Retrieved {len(all_users)} users successfully.")

    # 3. Update 2 existing users
    # Update User 101: change department & designation
    update_data_1 = {
        "full_name": "Scenario User One Updated",
        "department": "Core Platform",
        "designation": "Senior Staff Engineer"
    }
    res_up1 = client.put(f"/users/{created_ids[0]}", json=update_data_1)
    assert res_up1.status_code == 200, f"Update user 1 failed: {res_up1.text}"
    updated_1 = res_up1.json()
    assert updated_1["full_name"] == "Scenario User One Updated"
    assert updated_1["department"] == "Core Platform"
    print(f"Scenario 3.1 PASSED: Updated user {created_ids[0]} -> {updated_1['full_name']}, {updated_1['department']}")

    # Update User 102: change phone & designation
    update_data_2 = {
        "designation": "Principal QA Architect",
        "phone_number": "+1-555-9999"
    }
    res_up2 = client.put(f"/users/{created_ids[1]}", json=update_data_2)
    assert res_up2.status_code == 200, f"Update user 2 failed: {res_up2.text}"
    updated_2 = res_up2.json()
    assert updated_2["designation"] == "Principal QA Architect"
    assert updated_2["phone_number"] == "+1-555-9999"
    print(f"Scenario 3.2 PASSED: Updated user {created_ids[1]} -> {updated_2['designation']}, {updated_2['phone_number']}")

    # 4. Delete one User (delete User 105)
    delete_id = created_ids[4]
    res_del = client.delete(f"/users/{delete_id}")
    assert res_del.status_code == 200, f"Delete user failed: {res_del.text}"
    print(f"Scenario 4 PASSED: Deleted user {delete_id}: {res_del.json()}")

    # 5. Try retrieving deleted user
    res_get_deleted = client.get(f"/users/{delete_id}")
    assert res_get_deleted.status_code == 404, f"Expected 404 for deleted user, got {res_get_deleted.status_code}"
    print(f"Scenario 5 PASSED: Retrieving deleted user {delete_id} correctly returned 404 Not Found.")

    # 6. Try creating another user with an existing ID
    duplicate_user = {
        "id": created_ids[0], # Already exists (User 101)
        "full_name": "Imposter User",
        "email": "imposter@testcorp.com",
        "role": "Employee",
        "employee_id": "SCEN-999",
        "password": "Password123"
    }
    res_dup = client.post("/users", json=duplicate_user)
    assert res_dup.status_code == 409, f"Expected 409 Conflict for duplicate user ID, got {res_dup.status_code}"
    print(f"Scenario 6 PASSED: Creating user with existing ID {created_ids[0]} correctly returned 409 Conflict: {res_dup.json()['detail']}.")

    # Clean up remaining test users
    for uid in created_ids[:4]:
        client.delete(f"/users/{uid}")
    print("--- All 6 Scenarios Passed Flawlessly! ---\n")


if __name__ == "__main__":
    test_user_management_crud_six_scenarios()
