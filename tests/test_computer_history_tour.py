import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_computer_history_tour_page_loads():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/computer-history-tour")
    assert response.status_code == 200
    assert "Computer History 3D Tour" in response.text
    assert "Charles Babbage" in response.text
    assert "Analytical Engine" in response.text
    assert "Alan Turing" in response.text
    assert "ENIAC" in response.text
    assert "Macintosh" in response.text

@pytest.mark.asyncio
async def test_immersive_learning_page_contains_computer_history():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/immersive-learning")
    assert response.status_code == 200
    assert "Computer History 3D Tour" in response.text
    assert "/computer-history-tour" in response.text
