import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add the project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    import asyncio
    os.environ["TURSO_DATABASE_URL"] = "file:test_airi.db"
    asyncio.run(init_db())
    yield
    if os.path.exists("test_airi.db"):
        os.remove("test_airi.db")

client = TestClient(app)

def test_registration_and_login():
    # 1. Register a new user
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "full_name": "New User",
        "password": "newpassword123",
        "role": "user"
    }
    response = client.post("/auth/register", json=user_data)
    assert response.status_code == 200
    assert response.json()["username"] == "newuser"
    assert response.json()["role"] == "user"

    # 2. Try to register same username again
    response = client.post("/auth/register", json=user_data)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()

    # 3. Login with the new user
    login_data = {
        "username": "newuser",
        "password": "newpassword123"
    }
    response = client.post("/auth/token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert token is not None

    # 4. Access protected /api/me
    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "newuser"
    assert response.json()["role"] == "user"

def test_admin_registration():
    admin_data = {
        "username": "newadmin",
        "email": "admin@example.com",
        "full_name": "New Admin",
        "password": "adminpassword123",
        "role": "admin"
    }
    response = client.post("/auth/register", json=admin_data)
    assert response.status_code == 200
    assert response.json()["role"] == "admin"

    # Login and check /api/me
    response = client.post("/auth/token", data={"username": "newadmin", "password": "adminpassword123"})
    token = response.json()["access_token"]

    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.json()["role"] == "admin"
