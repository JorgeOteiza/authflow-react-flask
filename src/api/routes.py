import re
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import (
    create_access_token, create_refresh_token, get_jwt, get_jwt_identity,
    jwt_required, set_access_cookies, set_refresh_cookies, unset_jwt_cookies,
)
from sqlalchemy.exc import IntegrityError

from api.extensions import limiter
from api.models import RevokedToken, User, db
from api.security import (
    as_utc, audit, consume_one_time_token, issue_one_time_token,
    password_is_compromised, send_account_email,
)


api = Blueprint("api", __name__)
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def error_response(code, message, status):
    return jsonify({"error": {"code": code, "message": message}}), status


def json_body():
    if not request.is_json:
        return None, error_response("invalid_content_type", "La solicitud debe usar JSON.", 415)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, error_response("invalid_json", "El cuerpo JSON no es válido.", 400)
    return data, None


def normalize_email(value):
    return value.strip().lower() if isinstance(value, str) else ""


def validate_email(email):
    return "Introduce un correo electrónico válido." if not email or len(email) > 120 or not EMAIL_PATTERN.fullmatch(email) else None


def validate_password(password):
    if not isinstance(password, str) or len(password) < 10 or len(password) > 128:
        return "La contraseña debe tener entre 10 y 128 caracteres."
    if not re.search(r"[a-z]", password) or not re.search(r"[A-Z]", password) or not re.search(r"\d", password):
        return "La contraseña debe incluir mayúsculas, minúsculas y números."
    try:
        if password_is_compromised(password):
            return "Esta contraseña aparece en filtraciones conocidas. Elige otra distinta."
    except Exception:
        current_app.logger.exception("Password breach service unavailable")
        if current_app.config.get("PASSWORD_BREACH_FAIL_CLOSED"):
            return "No fue posible validar la contraseña de forma segura. Inténtalo nuevamente."
    return None


def current_user():
    identity = get_jwt_identity()
    return db.session.get(User, int(identity)) if identity else None


def revoke_current_token():
    payload = get_jwt()
    if not db.session.scalar(db.select(RevokedToken.id).filter_by(jti=payload["jti"])):
        db.session.add(RevokedToken(
            jti=payload["jti"], token_type=payload["type"], user_id=int(payload["sub"]),
            expires_at=datetime.fromtimestamp(payload["exp"], timezone.utc),
        ))


def authentication_response(user, status=200):
    claims = {"ver": user.session_version}
    access_token = create_access_token(identity=str(user.id), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=claims)
    response = jsonify({"user": user.serialize()})
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    return response, status


@api.get("/health")
def health():
    return jsonify({"status": "ok"}), 200


@api.post("/auth/signup")
@limiter.limit("5 per minute")
def signup():
    data, error = json_body()
    if error: return error
    email, password = normalize_email(data.get("email")), data.get("password")
    validation_error = validate_email(email) or validate_password(password)
    if validation_error: return error_response("validation_error", validation_error, 422)
    if db.session.scalar(db.select(User).filter_by(email=email)):
        return error_response("email_in_use", "Ya existe una cuenta con este correo.", 409)
    user = User(email=email)
    user.set_password(password)
    if not current_app.config["REQUIRE_EMAIL_VERIFICATION"]:
        user.email_verified_at = datetime.now(timezone.utc)
    db.session.add(user)
    try:
        db.session.flush()
        audit("account_created", user)
        if current_app.config["REQUIRE_EMAIL_VERIFICATION"]:
            token = issue_one_time_token(user, "verify_email", 60 * 24)
            send_account_email(email, "Verifica tu cuenta de AuthFlow", f"/verify-email?token={token}")
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response("email_in_use", "Ya existe una cuenta con este correo.", 409)
    if current_app.config["REQUIRE_EMAIL_VERIFICATION"]:
        return jsonify({"message": "Cuenta creada. Revisa tu correo para verificarla.", "verification_required": True}), 201
    return authentication_response(user, 201)


@api.post("/auth/verify-email")
@limiter.limit("10 per hour")
def verify_email():
    data, error = json_body()
    if error: return error
    record = consume_one_time_token(data.get("token"), "verify_email")
    if not record: return error_response("invalid_or_expired_token", "El enlace no es válido o ha expirado.", 400)
    user = db.session.get(User, record.user_id)
    user.email_verified_at = datetime.now(timezone.utc)
    audit("email_verified", user)
    db.session.commit()
    return authentication_response(user)


@api.post("/auth/resend-verification")
@limiter.limit("3 per hour")
def resend_verification():
    data, error = json_body()
    if error: return error
    email = normalize_email(data.get("email"))
    user = db.session.scalar(db.select(User).filter_by(email=email))
    if user and not user.email_verified_at:
        token = issue_one_time_token(user, "verify_email", 60 * 24)
        send_account_email(email, "Verifica tu cuenta de AuthFlow", f"/verify-email?token={token}")
        audit("verification_resent", user)
        db.session.commit()
    return jsonify({"message": "Si la cuenta existe y está pendiente, recibirás un correo."}), 200


@api.post("/auth/login")
@limiter.limit("5 per minute")
def login():
    data, error = json_body()
    if error: return error
    email, password = normalize_email(data.get("email")), data.get("password")
    if not email or not isinstance(password, str):
        return error_response("missing_credentials", "El correo y la contraseña son obligatorios.", 400)
    user = db.session.scalar(db.select(User).filter_by(email=email))
    if user is None or not user.check_password(password):
        audit("login_failed", email=email)
        db.session.commit()
        return error_response("invalid_credentials", "El correo o la contraseña no son correctos.", 401)
    if not user.is_active: return error_response("account_disabled", "Esta cuenta está desactivada.", 403)
    if current_app.config["REQUIRE_EMAIL_VERIFICATION"] and not user.email_verified_at:
        return error_response("email_not_verified", "Debes verificar tu correo antes de iniciar sesión.", 403)
    user.last_login = datetime.now(timezone.utc)
    audit("login_succeeded", user)
    db.session.commit()
    return authentication_response(user)


@api.post("/auth/refresh")
@jwt_required(refresh=True)
@limiter.limit("20 per minute")
def refresh():
    user = current_user()
    if user is None or not user.is_active: return error_response("account_unavailable", "La cuenta no está disponible.", 401)
    revoke_current_token()
    audit("session_refreshed", user)
    db.session.commit()
    return authentication_response(user)


@api.post("/auth/logout")
@jwt_required()
def logout():
    user = current_user()
    revoke_current_token()
    user.session_version += 1
    audit("logout", user)
    db.session.commit()
    response = jsonify({"message": "Sesión cerrada correctamente."})
    unset_jwt_cookies(response)
    return response, 200


@api.post("/auth/forgot-password")
@limiter.limit("3 per hour")
def forgot_password():
    data, error = json_body()
    if error: return error
    email = normalize_email(data.get("email"))
    user = db.session.scalar(db.select(User).filter_by(email=email))
    if user and user.is_active:
        token = issue_one_time_token(user, "reset_password", 30)
        send_account_email(email, "Restablece tu contraseña de AuthFlow", f"/reset-password?token={token}")
        audit("password_reset_requested", user)
        db.session.commit()
    return jsonify({"message": "Si la cuenta existe, recibirás instrucciones para restablecerla."}), 200


@api.post("/auth/reset-password")
@limiter.limit("5 per hour")
def reset_password():
    data, error = json_body()
    if error: return error
    password_error = validate_password(data.get("password"))
    if password_error: return error_response("validation_error", password_error, 422)
    record = consume_one_time_token(data.get("token"), "reset_password")
    if not record: return error_response("invalid_or_expired_token", "El enlace no es válido o ha expirado.", 400)
    user = db.session.get(User, record.user_id)
    user.set_password(data["password"])
    user.session_version += 1
    audit("password_reset_completed", user)
    db.session.commit()
    response = jsonify({"message": "Contraseña actualizada. Ya puedes iniciar sesión."})
    unset_jwt_cookies(response)
    return response, 200


@api.get("/me")
@jwt_required()
def get_me():
    user = current_user()
    if user is None or not user.is_active: return error_response("account_unavailable", "La cuenta no está disponible.", 401)
    return jsonify({"user": user.serialize()}), 200


@api.put("/me")
@jwt_required()
def update_me():
    user = current_user()
    if user is None or not user.is_active: return error_response("account_unavailable", "La cuenta no está disponible.", 401)
    data, error = json_body()
    if error: return error
    email = normalize_email(data.get("email")) if "email" in data else user.email
    current_password, new_password = data.get("current_password"), data.get("new_password")
    validation_error = validate_email(email)
    if validation_error: return error_response("validation_error", validation_error, 422)
    if email != user.email or new_password:
        if not isinstance(current_password, str) or not user.check_password(current_password):
            return error_response("invalid_password", "La contraseña actual no es correcta.", 403)
    if new_password:
        password_error = validate_password(new_password)
        if password_error: return error_response("validation_error", password_error, 422)
    if db.session.scalar(db.select(User).where(User.email == email, User.id != user.id)):
        return error_response("email_in_use", "Ya existe una cuenta con este correo.", 409)
    email_changed = email != user.email
    if email_changed:
        user.email, user.email_verified_at = email, None
        token = issue_one_time_token(user, "verify_email", 60 * 24)
        send_account_email(email, "Verifica tu nuevo correo de AuthFlow", f"/verify-email?token={token}")
    if new_password:
        user.set_password(new_password)
        user.session_version += 1
    audit("account_updated", user, details={"email_changed": email_changed, "password_changed": bool(new_password)})
    try: db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response("email_in_use", "Ya existe una cuenta con este correo.", 409)
    return jsonify({"user": user.serialize()}), 200


@api.delete("/me")
@jwt_required()
def delete_me():
    user = current_user()
    if user is None: return error_response("account_not_found", "La cuenta no existe.", 404)
    data, error = json_body()
    if error: return error
    if not isinstance(data.get("password"), str) or not user.check_password(data["password"]):
        return error_response("invalid_password", "La contraseña no es correcta.", 403)
    db.session.delete(user)
    db.session.commit()
    response = jsonify({"message": "Cuenta eliminada correctamente."})
    unset_jwt_cookies(response)
    return response, 200
