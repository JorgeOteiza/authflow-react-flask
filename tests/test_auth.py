import pytest

from app import create_app
from api.models import User, db
from tests.conftest import csrf_header


def test_signup_normalizes_email_and_sets_secure_session(client, app):
    response = client.post("/api/auth/signup", json={
        "email": "  Person@Example.COM ",
        "password": "Secure123",
    })

    assert response.status_code == 201
    assert response.get_json()["user"]["email"] == "person@example.com"
    assert "token" not in response.get_json()
    assert "HttpOnly" in response.headers.getlist("Set-Cookie")[0]
    with app.app_context():
        user = db.session.scalar(db.select(User).filter_by(email="person@example.com"))
        assert user.password_hash != "Secure123"
        assert user.check_password("Secure123")


def test_signup_rejects_weak_password_and_duplicate_email(client):
    weak = client.post("/api/auth/signup", json={"email": "person@example.com", "password": "password"})
    assert weak.status_code == 422

    payload = {"email": "person@example.com", "password": "Secure123"}
    assert client.post("/api/auth/signup", json=payload).status_code == 201
    duplicate = client.post("/api/auth/signup", json=payload)
    assert duplicate.status_code == 409
    assert duplicate.get_json()["error"]["code"] == "email_in_use"


def test_login_rejects_bad_credentials_and_disabled_accounts(client, app):
    client.post("/api/auth/signup", json={"email": "person@example.com", "password": "Secure123"})
    client.post("/api/auth/logout")
    invalid = client.post("/api/auth/login", json={"email": "person@example.com", "password": "Wrong123"})
    assert invalid.status_code == 401

    with app.app_context():
        user = db.session.scalar(db.select(User).filter_by(email="person@example.com"))
        user.is_active = False
        db.session.commit()
    disabled = client.post("/api/auth/login", json={"email": "person@example.com", "password": "Secure123"})
    assert disabled.status_code == 403


def test_login_updates_last_login(client, app):
    client.post("/api/auth/signup", json={"email": "person@example.com", "password": "Secure123"})
    client.post("/api/auth/logout")
    response = client.post("/api/auth/login", json={"email": "person@example.com", "password": "Secure123"})
    assert response.status_code == 200
    assert response.get_json()["user"]["last_login"] is not None


def test_me_requires_authentication(client, registered_client):
    assert registered_client.get("/api/me").status_code == 200
    other_client = client.application.test_client()
    response = other_client.get("/api/me")
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "authentication_required"


def test_user_can_update_only_own_account(registered_client):
    response = registered_client.put(
        "/api/me",
        json={"email": "new@example.com", "current_password": "Secure123"},
        headers=csrf_header(registered_client),
    )
    assert response.status_code == 200
    assert response.get_json()["user"]["email"] == "new@example.com"
    assert registered_client.get("/api/users").status_code == 404
    assert registered_client.get("/api/users/1").status_code == 404


def test_update_requires_current_password(registered_client):
    response = registered_client.put(
        "/api/me",
        json={"email": "new@example.com", "current_password": "Wrong123"},
        headers=csrf_header(registered_client),
    )
    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "invalid_password"


def test_user_can_delete_own_account(registered_client, app):
    response = registered_client.delete(
        "/api/me",
        json={"password": "Secure123"},
        headers=csrf_header(registered_client),
    )
    assert response.status_code == 200
    with app.app_context():
        assert db.session.scalar(db.select(User)) is None


def test_non_json_payload_is_rejected(client):
    response = client.post("/api/auth/signup", data="not-json", content_type="text/plain")
    assert response.status_code == 415
    assert response.get_json()["error"]["code"] == "invalid_content_type"


def test_csrf_is_required_for_account_changes(registered_client):
    response = registered_client.put(
        "/api/me",
        json={"email": "new@example.com", "current_password": "Secure123"},
    )
    assert response.status_code == 401


def test_login_is_rate_limited():
    application = create_app({
        "TESTING": True,
        "ENVIRONMENT": "testing",
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "rate-limit-test-secret-with-32-bytes",
        "JWT_SECRET_KEY": "rate-limit-jwt-secret-with-32-bytes",
        "JWT_COOKIE_SECURE": False,
        "RATELIMIT_ENABLED": True,
        "RATELIMIT_STORAGE_URI": "memory://",
    })
    with application.app_context():
        db.create_all()
        limited_client = application.test_client()
        for _ in range(5):
            response = limited_client.post("/api/auth/login", json={"email": "none@example.com", "password": "Wrong123"})
            assert response.status_code == 401
        response = limited_client.post("/api/auth/login", json={"email": "none@example.com", "password": "Wrong123"})
        assert response.status_code == 429
        db.drop_all()


def test_production_rejects_short_secrets():
    with pytest.raises(RuntimeError, match="SECRET_KEY must contain at least 32 bytes"):
        create_app({
            "ENVIRONMENT": "production",
            "DATABASE_URL": "sqlite:///:memory:",
            "SECRET_KEY": "short",
            "JWT_SECRET_KEY": "also-short",
        })


def test_unknown_api_route_returns_structured_404(client):
    response = client.get("/api/does-not-exist")
    assert response.status_code == 404
    assert response.is_json
    assert response.get_json()["error"]["code"] == "not_found"


def test_local_frontend_origin_is_allowed_by_cors(client):
    response = client.options(
        "/api/auth/signup",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"
    assert response.headers["Access-Control-Allow-Credentials"] == "true"
