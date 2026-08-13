# API de AuthFlow

Todas las respuestas de error tienen esta forma:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Descripción segura del problema."
  }
}
```

La autenticación usa cookies. El navegador debe enviar las solicitudes con credenciales. Las operaciones que modifican datos requieren el valor de la cookie CSRF correspondiente en el encabezado `X-CSRF-TOKEN`.

## Crear una cuenta

`POST /api/auth/signup`

```json
{
  "email": "person@example.com",
  "password": "Secure1234"
}
```

La contraseña debe tener entre 10 y 128 caracteres e incluir mayúsculas, minúsculas y números. En producción puede comprobarse contra Pwned Passwords mediante k-anonymity: solo se comparte el prefijo de cinco caracteres del SHA-1.

Si la verificación está habilitada, la cuenta queda pendiente y recibe un enlace de un solo uso válido durante 24 horas.

## Verificación y recuperación

- `POST /api/auth/verify-email` acepta `{ "token": "..." }`.
- `POST /api/auth/resend-verification` acepta `{ "email": "person@example.com" }`.
- `POST /api/auth/forgot-password` acepta el correo y responde siempre de forma genérica.
- `POST /api/auth/reset-password` acepta `{ "token": "...", "password": "NewSecure1234" }`.

Los tokens son aleatorios, de un solo uso, tienen expiración y solo se almacenan mediante SHA-256.

## Iniciar sesión

`POST /api/auth/login`

```json
{
  "email": "person@example.com",
  "password": "Secure1234"
}
```

El servidor establece las cookies de acceso, renovación y CSRF. El access token expira en 15 minutos y el refresh token en 7 días.
Las cuentas pendientes de verificar no pueden iniciar sesión.

## Renovar sesión

`POST /api/auth/refresh`

Requiere la cookie de renovación y el encabezado `X-CSRF-TOKEN` con el valor de `csrf_refresh_token`.
Cada uso revoca el refresh token anterior y entrega un par nuevo.

## Perfil actual

`GET /api/me` devuelve exclusivamente la cuenta identificada por el JWT.

`PUT /api/me` acepta:

```json
{
  "email": "new@example.com",
  "current_password": "Secure123",
  "new_password": "NewSecure456"
}
```

`new_password` es opcional. Cambiar el correo o la contraseña exige `current_password`.

`DELETE /api/me` elimina definitivamente la cuenta actual:

```json
{
  "password": "Secure123"
}
```

## Cerrar sesión

`POST /api/auth/logout` requiere access token y CSRF, elimina las cookies e incrementa la versión de sesión. Esto invalida todos los access y refresh tokens anteriores, incluso copias externas.

Todas las fechas se serializan como ISO 8601 UTC (`Z`) para que el cliente las convierta a la zona horaria local.
