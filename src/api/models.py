from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_login = db.Column(db.DateTime, nullable=True) 

    def __repr__(self):
        return f'<User {self.email}>'

    def set_password(self, password):
        """Crea el hash de la contraseña."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verifica la contraseña comparando el hash."""
        return check_password_hash(self.password_hash, password)

    def update_last_login(self):
        """Actualiza el campo last_login con la fecha y hora actual."""
        self.last_login = datetime.now(timezone.utc)

    def serialize(self):
        """Convierte el objeto en un formato JSON serializable."""
        return {
            "id": self.id,
            "email": self.email,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "last_login": self.last_login.isoformat() if self.last_login else None
            # No serializar el hash de la contraseña, es un riesgo de seguridad, no olvidar*
        }
