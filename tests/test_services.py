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
    os.environ["TURSO_DATABASE_URL"] = "file:test_services.db"
    asyncio.run(init_db())
    yield
    if os.path.exists("test_services.db"):
        os.remove("test_services.db")

client = TestClient(app)

def test_services_page_status():
    response = client.get("/services")
    assert response.status_code == 200
    assert "Services We Offer" in response.text
    # Check for a specific word that should be in the titles
    assert "Research" in response.text
    assert "Innovation" in response.text

def test_services_data_integrity():
    from app.database import get_db
    import asyncio

    async def check_db():
        async for db in get_db():
            cursor = await db.execute("SELECT COUNT(*) FROM services")
            return cursor.rows[0][0]

    count = asyncio.run(check_db())
    assert count >= 8
