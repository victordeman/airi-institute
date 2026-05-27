import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_biology_galaxy_page_loads():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/biology-galaxy")
    assert response.status_code == 200
    assert "Biology Galaxy" in response.text
    assert "Cell Biology" in response.text
    assert "DNA & Genetics" in response.text
    assert "Ecosystem" in response.text
    assert "Immune System" in response.text
    assert "Evolution" in response.text

@pytest.mark.asyncio
async def test_immersive_learning_page_contains_biology_galaxy():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/immersive-learning")
    assert response.status_code == 200
    assert "Biology Galaxy" in response.text
    assert "/biology-galaxy" in response.text
