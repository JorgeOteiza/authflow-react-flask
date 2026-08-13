import logging
import os
from datetime import timedelta
from uuid import uuid4

from flask import Flask, abort, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from werkzeug.exceptions import HTTPException

from api.commands import setup_commands
from api.extensions import limiter
from api.models import db
from api.routes import api
from api.utils import generate_sitemap


def required_setting(name, overrides):
    value = overrides.get(name) if overrides else None
    value = value or os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def required_secret(name, overrides, is_production):
    value = required_setting(name, overrides)
    if is_production and len(value.encode("utf-8")) < 32:
        raise RuntimeError(f"{name} must contain at least 32 bytes in production")
    return value


def create_app(test_config=None):
    app = Flask(__name__)
    test_config = test_config or {}
    environment = test_config.get("ENVIRONMENT", os.getenv("FLASK_ENV", "development"))
    is_production = environment == "production"

    database_url = required_setting("DATABASE_URL", test_config).replace("postgres://", "postgresql://", 1)
    app.config.update(
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SECRET_KEY=required_secret("SECRET_KEY", test_config, is_production),
        JWT_SECRET_KEY=required_secret("JWT_SECRET_KEY", test_config, is_production),
        JWT_TOKEN_LOCATION=["cookies"],
        JWT_ACCESS_COOKIE_PATH="/api/",
        JWT_REFRESH_COOKIE_PATH="/api/auth/refresh",
        JWT_COOKIE_SECURE=is_production,
        JWT_COOKIE_SAMESITE="Lax",
        JWT_COOKIE_CSRF_PROTECT=True,
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(minutes=15),
        JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=7),
        RATELIMIT_STORAGE_URI=os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
        RATELIMIT_HEADERS_ENABLED=True,
        PROPAGATE_EXCEPTIONS=False,
    )
    app.config.update(test_config)

    db.init_app(app)
    Migrate(app, db, compare_type=True)
    jwt = JWTManager(app)
    limiter.init_app(app)

    cors_origin = app.config.get("CORS_ORIGIN") or os.getenv("CORS_ORIGIN", "http://localhost:3000")
    CORS(
        app,
        resources={r"/api/*": {"origins": [origin.strip() for origin in cors_origin.split(",")]}},
        supports_credentials=True,
    )

    setup_commands(app)
    app.register_blueprint(api, url_prefix="/api")

    @app.after_request
    def security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'self' http://localhost:3001"
        )
        if is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({"error": {"code": "authentication_required", "message": "Debes iniciar sesión."}}), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({"error": {"code": "invalid_token", "message": "La sesión no es válida."}}), 401

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({"error": {"code": "token_expired", "message": "La sesión ha expirado."}}), 401

    @jwt.revoked_token_loader
    def revoked_token(jwt_header, jwt_payload):
        return jsonify({"error": {"code": "token_revoked", "message": "La sesión fue revocada."}}), 401

    @jwt.user_lookup_error_loader
    def missing_user(jwt_header, jwt_payload):
        return jsonify({"error": {"code": "account_not_found", "message": "La cuenta no existe."}}), 401

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return jsonify({"error": {"code": error.name.lower().replace(" ", "_"), "message": error.description}}), error.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        incident_id = uuid4().hex
        app.logger.exception("Unhandled error [%s]", incident_id, exc_info=error)
        return jsonify({
            "error": {
                "code": "internal_error",
                "message": "Ha ocurrido un error inesperado.",
                "incident_id": incident_id,
            }
        }), 500

    @app.get("/")
    def index():
        static_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../dist/")
        return generate_sitemap(app) if environment == "development" else send_from_directory(static_dir, "index.html")

    @app.get("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            abort(404)
        static_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../dist/")
        requested_path = path if os.path.isfile(os.path.join(static_dir, path)) else "index.html"
        return send_from_directory(static_dir, requested_path)

    if not app.debug:
        logging.basicConfig(level=logging.INFO)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 3001)),
        debug=os.getenv("FLASK_DEBUG") == "1",
    )
