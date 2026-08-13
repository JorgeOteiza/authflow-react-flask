import re
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
)
from sqlalchemy.exc import IntegrityError

from api.extensions import limiter
from api.models import User, db


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
    if not email or len(email) > 120 or not EMAIL_PATTERN.fullmatch(email):
        return "Introduce un correo electrónico válido."
    return None


def validate_password(password):
    if not isinstance(password, str) or len(password) < 8 or len(password) > 128:
        return "La contraseña debe tener entre 8 y 128 caracteres."
    if not re.search(r"[a-z]", password) or not re.search(r"[A-Z]", password) or not re.search(r"\d", password):
        return "La contraseña debe incluir mayúsculas, minúsculas y números."
    return None


def current_user():
    identity = get_jwt_identity()
    return db.session.get(User, int(identity)) if identity else None


def authentication_response(user, status=200):
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
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
    if error:
        return error

    email = normalize_email(data.get("email"))
    password = data.get("password")
    email_error = validate_email(email)
    password_error = validate_password(password)
    if email_error or password_error:
        return error_response("validation_error", email_error or password_error, 422)

    if db.session.scalar(db.select(User).filter_by(email=email)):
        return error_response("email_in_use", "Ya existe una cuenta con este correo.", 409)

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response("email_in_use", "Ya existe una cuenta con este correo.", 409)

    return authentication_response(user, 201)


@api.post("/auth/login")
@limiter.limit("5 per minute")
def login():
    data, error = json_body()
    if error:
        return error

    email = normalize_email(data.get("email"))
    password = data.get("password")
    if not email or not isinstance(password, str):
        return error_response("missing_credentials", "El correo y la contraseña son obligatorios.", 400)

    user = db.session.scalar(db.select(User).filter_by(email=email))
    if user is None or not user.check_password(password):
        return error_response("invalid_credentials", "El correo o la contraseña no son correctos.", 401)
    if not user.is_active:
        return error_response("account_disabled", "Esta cuenta está desactivada.", 403)

    user.last_login = datetime.now(timezone.utc)
    db.session.commit()
    return authentication_response(user)


@api.post("/auth/refresh")
@jwt_required(refresh=True)
@limiter.limit("20 per minute")
def refresh():
    user = current_user()
    if user is None or not user.is_active:
        return error_response("account_unavailable", "La cuenta no está disponible.", 401)
    return authentication_response(user)


@api.post("/auth/logout")
def logout():
    response = jsonify({"message": "Sesión cerrada correctamente."})
    unset_jwt_cookies(response)
    return response, 200


@api.get("/me")
@jwt_required()
def get_me():
    user = current_user()
    if user is None or not user.is_active:
        return error_response("account_unavailable", "La cuenta no está disponible.", 401)
    return jsonify({"user": user.serialize()}), 200


@api.put("/me")
@jwt_required()
def update_me():
    user = current_user()
    if user is None or not user.is_active:
        return error_response("account_unavailable", "La cuenta no está disponible.", 401)

    data, error = json_body()
    if error:
        return error

    email = normalize_email(data.get("email")) if "email" in data else user.email
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    email_error = validate_email(email)
    if email_error:
        return error_response("validation_error", email_error, 422)
    if email != user.email or new_password:
        if not isinstance(current_password, str) or not user.check_password(current_password):
            return error_response("invalid_password", "La contraseña actual no es correcta.", 403)
    if new_password:
        password_error = validate_password(new_password)
        if password_error:
            return error_response("validation_error", password_error, 422)

    existing = db.session.scalar(db.select(User).where(User.email == email, User.id != user.id))
    if existing:
        return error_response("email_in_use", "Ya existe una cuenta con este correo.", 409)

    user.email = email
    if new_password:
        user.set_password(new_password)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response("email_in_use", "Ya existe una cuenta con este correo.", 409)
    return jsonify({"user": user.serialize()}), 200


@api.delete("/me")
@jwt_required()
def delete_me():
    user = current_user()
    if user is None:
        return error_response("account_not_found", "La cuenta no existe.", 404)

    data, error = json_body()
    if error:
        return error
    password = data.get("password")
    if not isinstance(password, str) or not user.check_password(password):
        return error_response("invalid_password", "La contraseña no es correcta.", 403)

    db.session.delete(user)
    db.session.commit()
    response = jsonify({"message": "Cuenta eliminada correctamente."})
    unset_jwt_cookies(response)
    return response, 200
