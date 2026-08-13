from datetime import datetime, timedelta, timezone

import click

from api.models import OneTimeToken, RevokedToken, SecurityEvent, db


def setup_commands(app):
    @app.cli.command("purge-security-records")
    @click.option("--event-retention-days", default=90, show_default=True)
    def purge_security_records(event_retention_days):
        """Remove expired one-time and revoked-token records."""
        now = datetime.now(timezone.utc)
        revoked = db.session.execute(db.delete(RevokedToken).where(RevokedToken.expires_at < now)).rowcount
        one_time = db.session.execute(db.delete(OneTimeToken).where(OneTimeToken.expires_at < now)).rowcount
        events = db.session.execute(
            db.delete(SecurityEvent).where(SecurityEvent.created_at < now - timedelta(days=event_retention_days))
        ).rowcount
        db.session.commit()
        click.echo(f"Removed {revoked} revoked tokens, {one_time} one-time tokens and {events} old security events.")
