"""Isolated backend used exclusively by Playwright."""

import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from app import create_app
from api.models import db


app = create_app({
    "ENVIRONMENT": "testing",
    "TESTING": True,
    "DATABASE_URL": "sqlite:///:memory:",
    "SECRET_KEY": "e2e-application-secret-with-at-least-32-bytes",
    "JWT_SECRET_KEY": "e2e-jwt-secret-with-at-least-32-bytes-long",
    "CORS_ORIGIN": "http://localhost:3100",
    "RATELIMIT_STORAGE_URI": "memory://",
    "REQUIRE_EMAIL_VERIFICATION": False,
    "PASSWORD_BREACH_CHECK": False,
})

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(host="localhost", port=3101, debug=False, use_reloader=False)
