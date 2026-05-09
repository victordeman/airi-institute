from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_test_tours_routes():
    # Test main test tours gallery
    response = client.get("/immersive-learning/test-tours")
    assert response.status_code == 200
    assert b"Test Tours" in response.content
    assert b"D-Supply Test" in response.content
    assert b"Terracotta 3D Tour" in response.content

    # Test economics tour test duplicate
    response = client.get("/economics-tour-test")
    assert response.status_code == 200
    assert b"D-Supply Test" in response.content
    assert b"Test Market Model" in response.content

    # Test terracotta tour test duplicate
    response = client.get("/terracotta-tour-test")
    assert response.status_code == 200
    assert b"Terracotta 3D Tour (Test)" in response.content
    assert b"Test Environment" in response.content

def test_immersive_learning_link():
    response = client.get("/immersive-learning")
    assert response.status_code == 200
    assert b"/immersive-learning/test-tours" not in response.content
