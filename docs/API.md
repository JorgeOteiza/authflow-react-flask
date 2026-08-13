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
  "password": "Secure123"
}
```

La contraseña debe tener entre 8 y 128 caracteres e incluir mayúsculas, minúsculas y números.

## Iniciar sesión

`POST /api/auth/login`

```json
{
  "email": "person@example.com",
  "password": "Secure123"
}
```

El servidor establece las cookies de acceso, renovación y CSRF. El access token expira en 15 minutos y el refresh token en 7 días.

## Renovar sesión

`POST /api/auth/refresh`

Requiere la cookie de renovación y el encabezado `X-CSRF-TOKEN` con el valor de `csrf_refresh_token`.

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

`POST /api/auth/logout` elimina todas las cookies JWT del navegador.
