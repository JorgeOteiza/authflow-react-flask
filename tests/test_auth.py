import pytest

from app import create_app
from api.models import RevokedToken, SecurityEvent, User, db
from tests.conftest import csrf_header


def test_signup_normalizes_email_and_sets_secure_session(client, app):
    response = client.post("/api/auth/signup", json={
        "email": "  Person@Example.COM ",
        "password": "Secure1234",
    })

    assert response.status_code == 201
    assert response.get_json()["user"]["email"] == "person@example.com"
    assert "token" not in response.get_json()
    assert "HttpOnly" in response.headers.getlist("Set-Cookie")[0]
    with app.app_context():
        user = db.session.scalar(db.select(User).filter_by(email="person@example.com"))
        assert user.password_hash != "Secure1234"
        assert user.check_password("Secure1234")


def test_signup_rejects_weak_password_and_duplicate_email(client):
    weak = client.post("/api/auth/signup", json={"email": "person@example.com", "password": "password"})
    assert weak.status_code == 422

    payload = {"email": "person@example.com", "password": "Secure1234"}
    assert client.post("/api/auth/signup", json=payload).status_code == 201
    duplicate = client.post("/api/auth/signup", json=payload)
    assert duplicate.status_code == 409
    assert duplicate.get_json()["error"]["code"] == "email_in_use"


def test_login_rejects_bad_credentials_and_disabled_accounts(client, app):
    client.post("/api/auth/signup", json={"email": "person@example.com", "password": "Secure1234"})
    client.post("/api/auth/logout")
    invalid = client.post("/api/auth/login", json={"email": "person@example.com", "password": "Wrong1234"})
    assert invalid.status_code == 401

    with app.app_context():
        user = db.session.scalar(db.select(User).filter_by(email="person@example.com"))
        user.is_active = False
        db.session.commit()
    disabled = client.post("/api/auth/login", json={"email": "person@example.com", "password": "Secure1234"})
    assert disabled.status_code == 403


def test_login_updates_last_login(client, app):
    client.post("/api/auth/signup", json={"email": "person@example.com", "password": "Secure1234"})
    client.post("/api/auth/logout")
    response = client.post("/api/auth/login", json={"email": "person@example.com", "password": "Secure1234"})
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
        json={"email": "new@example.com", "current_password": "Secure1234"},
        headers=csrf_header(registered_client),
    )
    assert response.status_code == 200
    assert response.get_json()["user"]["email"] == "new@example.com"
    assert registered_client.get("/api/users").status_code == 404
    assert registered_client.get("/api/users/1").status_code == 404


def test_update_requires_current_password(registered_client):
    response = registered_client.put(
        "/api/me",
        json={"email": "new@example.com", "current_password": "Wrong1234"},
        headers=csrf_header(registered_client),
    )
    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "invalid_password"


def test_user_can_delete_own_account(registered_client, app):
    response = registered_client.delete(
        "/api/me",
        json={"password": "Secure1234"},
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
            response = limited_client.post("/api/auth/login", json={"email": "none@example.com", "password": "Wrong1234"})
            assert response.status_code == 401
        response = limited_client.post("/api/auth/login", json={"email": "none@example.com", "password": "Wrong1234"})
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


def test_production_requires_redis_for_shared_rate_limits():
    with pytest.raises(RuntimeError, match="must use Redis"):
        create_app({
            "ENVIRONMENT": "production",
            "DATABASE_URL": "sqlite:///:memory:",
            "SECRET_KEY": "production-app-secret-with-more-than-32-bytes",
            "JWT_SECRET_KEY": "production-jwt-secret-with-more-than-32-bytes",
            "RATELIMIT_STORAGE_URI": "memory://",
        })


def test_compromised_password_is_rejected(client, monkeypatch):
    monkeypatch.setattr("api.routes.password_is_compromised", lambda password: True)
    client.application.config["PASSWORD_BREACH_CHECK"] = True
    response = client.post("/api/auth/signup", json={"email": "safe@example.com", "password": "Leaked12345"})
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "validation_error"


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


def test_logout_revokes_access_token(registered_client, app):
    access_cookie = registered_client.get_cookie("access_token_cookie", path="/api/").value
    refresh_cookie = registered_client.get_cookie("refresh_token_cookie", path="/api/auth/refresh").value
    refresh_csrf = registered_client.get_cookie("csrf_refresh_token").value
    csrf_cookie = registered_client.get_cookie("csrf_access_token", path="/").value
    response = registered_client.post("/api/auth/logout", headers={"X-CSRF-TOKEN": csrf_cookie})
    assert response.status_code == 200
    replay_client = app.test_client()
    replay_client.set_cookie("access_token_cookie", access_cookie)
    assert replay_client.get("/api/me").status_code == 401
    replay_client.set_cookie("refresh_token_cookie", refresh_cookie)
    replay_client.set_cookie("csrf_refresh_token", refresh_csrf)
    assert replay_client.post("/api/auth/refresh", headers={"X-CSRF-TOKEN": refresh_csrf}).status_code == 401
    with app.app_context():
        assert db.session.scalar(db.select(RevokedToken)) is not None


def test_refresh_token_is_rotated_and_cannot_be_replayed(registered_client, app):
    old_refresh = registered_client.get_cookie("refresh_token_cookie", path="/api/auth/refresh").value
    old_csrf = registered_client.get_cookie("csrf_refresh_token").value
    response = registered_client.post("/api/auth/refresh", headers={"X-CSRF-TOKEN": old_csrf})
    assert response.status_code == 200
    assert registered_client.get_cookie("refresh_token_cookie", path="/api/auth/refresh").value != old_refresh
    replay_client = app.test_client()
    replay_client.set_cookie("refresh_token_cookie", old_refresh)
    replay_client.set_cookie("csrf_refresh_token", old_csrf)
    assert replay_client.post("/api/auth/refresh", headers={"X-CSRF-TOKEN": old_csrf}).status_code == 401


def test_email_verification_uses_one_time_token(client, app):
    app.config["REQUIRE_EMAIL_VERIFICATION"] = True
    response = client.post("/api/auth/signup", json={"email": "verify@example.com", "password": "Secure1234"})
    assert response.status_code == 201
    assert response.get_json()["verification_required"] is True
    assert client.post("/api/auth/login", json={"email": "verify@example.com", "password": "Secure1234"}).status_code == 403
    token = app.extensions["authflow_outbox"][-1]["link"].split("token=", 1)[1]
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 200
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 400


def test_password_reset_is_generic_and_one_time(client, app):
    client.post("/api/auth/signup", json={"email": "reset@example.com", "password": "Secure1234"})
    response = client.post("/api/auth/forgot-password", json={"email": "reset@example.com"})
    assert response.status_code == 200
    token = app.extensions["authflow_outbox"][-1]["link"].split("token=", 1)[1]
    assert client.post("/api/auth/reset-password", json={"token": token, "password": "Different1234"}).status_code == 200
    assert client.post("/api/auth/reset-password", json={"token": token, "password": "Another1234"}).status_code == 400
    assert client.post("/api/auth/forgot-password", json={"email": "missing@example.com"}).status_code == 200


def test_timestamps_are_explicit_utc(client):
    response = client.post("/api/auth/signup", json={"email": "time@example.com", "password": "Secure1234"})
    assert response.get_json()["user"]["created_at"].endswith("Z")


def test_security_events_are_recorded(client, app):
    client.post("/api/auth/signup", json={"email": "audit@example.com", "password": "Secure1234"})
    client.post("/api/auth/login", json={"email": "audit@example.com", "password": "Wrong1234"})
    with app.app_context():
        event_types = set(db.session.scalars(db.select(SecurityEvent.event_type)).all())
        assert {"account_created", "login_failed"}.issubset(event_types)
