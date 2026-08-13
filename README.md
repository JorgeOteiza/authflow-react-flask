# AuthFlow · React + Flask

Aplicación full stack de autenticación que demuestra un flujo seguro de registro, inicio de sesión y gestión de cuenta con React, Flask y JWT.

## Origen

AuthFlow comenzó durante un bootcamp de desarrollo full stack utilizando un starter educativo. Desde entonces ha sido ampliado, modernizado y mantenido por [Jorge Oteiza](https://github.com/JorgeOteiza). Actualmente es un repositorio independiente con arquitectura, interfaz, seguridad, pruebas y despliegue propios.

## Características

- Registro con normalización de correo y validación de contraseña.
- Inicio de sesión limitado contra ataques de fuerza bruta.
- Contraseñas almacenadas exclusivamente mediante hash.
- Access tokens de 15 minutos y refresh tokens de 7 días.
- Tokens almacenados en cookies `HttpOnly`, `Secure` en producción y `SameSite=Lax`.
- Protección CSRF mediante double-submit cookies.
- Restauración y renovación automática de sesión.
- Perfil privado sin IDs controlados por el cliente.
- Cambio de correo y contraseña verificando la contraseña actual.
- Eliminación segura de la propia cuenta.
- Respuestas de error estructuradas sin filtrar información interna.
- Migraciones de base de datos y pruebas automatizadas.
- Integración continua y despliegue preparado para Render.

## Tecnologías

- React 19, React Router y Context API.
- Flask, Flask-JWT-Extended y Flask-Limiter.
- SQLAlchemy, Alembic y PostgreSQL.
- Webpack 5.
- Pytest y GitHub Actions.

## Instalación local

Requisitos: Python 3.10+, Node.js 24 LTS, npm y PostgreSQL.

```bash
git clone https://github.com/JorgeOteiza/authflow-react-flask.git
cd authflow-react-flask
python -m venv .venv
```

Activa el entorno virtual, instala las dependencias y crea la configuración local:

```bash
python -m pip install -r requirements-dev.txt
npm ci
cp .env.example .env
```

Genera valores aleatorios diferentes, de al menos 32 bytes, para `SECRET_KEY` y `JWT_SECRET_KEY`. Configura también `DATABASE_URL` para tu instancia PostgreSQL.

Aplica las migraciones e inicia la API:

```bash
flask --app src/app.py db upgrade
flask run
```

En otra terminal, inicia React:

```bash
npm run dev
```

Frontend: `http://localhost:3000` · API: `http://localhost:3001`

## Comandos de verificación

```bash
pytest
npm audit
npm run build
```

## API

El contrato completo y los ejemplos se encuentran en [docs/API.md](docs/API.md). Los endpoints principales son:

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Crear una cuenta |
| `POST` | `/api/auth/login` | Iniciar sesión |
| `POST` | `/api/auth/refresh` | Renovar la sesión |
| `POST` | `/api/auth/logout` | Cerrar la sesión |
| `GET` | `/api/me` | Consultar el perfil actual |
| `PUT` | `/api/me` | Actualizar la propia cuenta |
| `DELETE` | `/api/me` | Eliminar la propia cuenta |
| `GET` | `/api/health` | Comprobar el servicio |

## Estructura

```text
src/
|-- api/          # API, modelo, validación y extensiones Flask
|-- front/        # Aplicación React
|-- app.py        # Application factory y configuración
`-- wsgi.py       # Entrada del servidor WSGI
migrations/       # Historial de esquema
tests/            # Pruebas de integración de la API
```

## Autor

Desarrollado y mantenido por [Jorge Oteiza](https://github.com/JorgeOteiza).
