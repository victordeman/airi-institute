
import os
import sys
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Add the project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    import asyncio
    asyncio.run(init_db())

client = TestClient(app)

@patch("smtplib.SMTP")
def test_contact_email_triggered(mock_smtp):
    # Mock SMTP instance
    mock_server = MagicMock()
    mock_smtp.return_value.__enter__.return_value = mock_server

    # Set required env vars for email to be attempted
    with patch.dict(os.environ, {
        "SMTP_HOST": "smtp.test.com",
        "SMTP_USER": "test@test.com",
        "SMTP_PASSWORD": "password"
    }):
        # Need a valid captcha first
        captcha_res = client.get("/api/captcha")
        data = captcha_res.json()
        question = data["question"]
        token = data["captcha_token"]
        parts = question.split(" ")
        ans = str(int(parts[0]) + int(parts[2]))

        payload = {
            "name": "Jane Doe",
            "email": "jane@example.com",
            "message": "This is a test message for email triggering.",
            "captcha_token": token,
            "captcha_answer": ans
        }

        # We use the TestClient which handles BackgroundTasks synchronously by default
        response = client.post("/api/contact", json=payload)

        assert response.status_code == 201
        assert response.json()["success"] is True

        # Verify SMTP was called
        mock_smtp.assert_called_once_with("smtp.test.com", 587)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test@test.com", "password")
        mock_server.send_message.assert_called_once()

        # Verify email content
        sent_msg = mock_server.send_message.call_args[0][0]
        assert sent_msg['To'] == "airi@airi.institute"
        assert "Jane Doe" in sent_msg['Subject']

        body = sent_msg.get_payload()[0].get_payload()
        assert "Jane Doe" in body
        assert "jane@example.com" in body
        assert "This is a test message for email triggering." in body

def test_contact_email_not_sent_missing_env():
    # If env vars are missing, it shouldn't crash but also shouldn't send
    with patch("smtplib.SMTP") as mock_smtp:
        with patch.dict(os.environ, {}, clear=True):
            # We need to make sure basic envs for the app itself aren't cleared if needed,
            # but here we mostly care about SMTP ones.
            # Actually clear=True might be dangerous if app needs other envs.
            # Let's just override to empty.
            os.environ["SMTP_HOST"] = ""

            captcha_res = client.get("/api/captcha")
            data = captcha_res.json()
            parts = data["question"].split(" ")
            ans = str(int(parts[0]) + int(parts[2]))

            payload = {
                "name": "Jane Doe",
                "email": "jane@example.com",
                "message": "This is a test message for email triggering.",
                "captcha_token": data["captcha_token"],
                "captcha_answer": ans
            }

            response = client.post("/api/contact", json=payload)
            assert response.status_code == 201
            mock_smtp.assert_not_called()
