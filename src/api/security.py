import hashlib
import logging
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from urllib.request import Request, urlopen

from flask import current_app, request

from api.models import OneTimeToken, SecurityEvent, db


logger = logging.getLogger(__name__)


def audit(event_type, user=None, email=None, details=None):
    event = SecurityEvent(
        event_type=event_type,
        user_id=user.id if user else None,
        email=email or (user.email if user else None),
        ip_address=request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip(),
        user_agent=(request.user_agent.string or "")[:255],
        details=details,
    )
    db.session.add(event)


def issue_one_time_token(user, purpose, lifetime_minutes):
    raw_token = secrets.token_urlsafe(32)
    db.session.add(OneTimeToken(
        token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
        purpose=purpose,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=lifetime_minutes),
    ))
    return raw_token


def consume_one_time_token(raw_token, purpose):
    if not isinstance(raw_token, str) or not raw_token:
        return None
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    record = db.session.scalar(db.select(OneTimeToken).filter_by(token_hash=token_hash, purpose=purpose))
    if not record or record.used_at or as_utc(record.expires_at) <= datetime.now(timezone.utc):
        return None
    record.used_at = datetime.now(timezone.utc)
    return record


def as_utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def send_account_email(recipient, subject, path):
    frontend_url = current_app.config["FRONTEND_URL"].rstrip("/")
    link = f"{frontend_url}{path}"
    if current_app.config["EMAIL_DELIVERY"] == "log":
        logger.warning("Development email for %s: %s", recipient, link)
        current_app.extensions.setdefault("authflow_outbox", []).append({"to": recipient, "subject": subject, "link": link})
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = current_app.config["MAIL_FROM"]
    message["To"] = recipient
    message.set_content(f"Abre este enlace para continuar con AuthFlow:\n\n{link}\n\nSi no solicitaste esto, ignora el mensaje.")
    context = ssl.create_default_context()
    with smtplib.SMTP(current_app.config["SMTP_HOST"], current_app.config["SMTP_PORT"], timeout=10) as server:
        server.starttls(context=context)
        server.login(current_app.config["SMTP_USERNAME"], current_app.config["SMTP_PASSWORD"])
        server.send_message(message)


def password_is_compromised(password):
    if not current_app.config["PASSWORD_BREACH_CHECK"]:
        return False
    digest = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix, suffix = digest[:5], digest[5:]
    request_object = Request(
        f"https://api.pwnedpasswords.com/range/{prefix}",
        headers={"Add-Padding": "true", "User-Agent": "AuthFlow-Portfolio"},
    )
    with urlopen(request_object, timeout=3) as response:
        return any(line.split(":", 1)[0] == suffix for line in response.read().decode().splitlines())
