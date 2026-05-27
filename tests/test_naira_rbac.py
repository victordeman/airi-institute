import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.security import create_access_token
from datetime import timedelta

client = TestClient(app)

def get_token(username: str):
    access_token = create_access_token(data={"sub": username}, expires_delta=timedelta(minutes=15))
    return access_token

def test_admin_dashboard_access():
    token = get_token("admin")
    response = client.get("/dashboard/admin", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "System Health" in response.text

def test_admin_dashboard_forbidden():
    token = get_token("student")
    response = client.get("/dashboard/admin", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

def test_student_dashboard_access():
    token = get_token("student")
    response = client.get("/dashboard/student", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "My Overview" in response.text

def test_guest_no_dashboard():
    token = get_token("guestuser")
    # Guest has no dashboard route defined that they can access
    response = client.get("/dashboard/student", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

def test_unauthenticated_dashboard():
    response = client.get("/dashboard/admin")
    assert response.status_code == 401
