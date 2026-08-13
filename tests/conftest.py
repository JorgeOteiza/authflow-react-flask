import os
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-app-secret-with-at-least-32-bytes")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-with-at-least-32-bytes")

from app import create_app
from api.models import db


@pytest.fixture()
def app():
    application = create_app({
        "TESTING": True,
        "ENVIRONMENT": "testing",
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "test-app-secret-with-at-least-32-bytes",
        "JWT_SECRET_KEY": "test-jwt-secret-with-at-least-32-bytes",
        "JWT_COOKIE_SECURE": False,
        "RATELIMIT_ENABLED": False,
        "REQUIRE_EMAIL_VERIFICATION": False,
        "PASSWORD_BREACH_CHECK": False,
    })
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def registered_client(client):
    response = client.post("/api/auth/signup", json={
        "email": "person@example.com",
        "password": "Secure1234",
    })
    assert response.status_code == 201
    return client


def csrf_header(client, cookie_name="csrf_access_token"):
    cookie = client.get_cookie(cookie_name)
    assert cookie is not None
    return {"X-CSRF-TOKEN": cookie.value}
