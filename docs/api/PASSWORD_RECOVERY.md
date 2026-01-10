# Recuperación de Contraseña

Este documento describe la implementación del flujo de recuperación de contraseña.

## Tabla de Contenidos

1. [Características](#características)
2. [Configuración](#configuración)
3. [Endpoints de la API](#endpoints-de-la-api)
4. [Flujo de Usuario](#flujo-de-usuario)
5. [Seguridad](#seguridad)
6. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Características

- ✅ Envío de emails de recuperación (actualmente deshabilitado)
- ✅ Tokens de recuperación seguros (32 bytes aleatorios)
- ✅ Expiración de tokens configurable (default: 1 hora)
- ✅ Templates HTML profesionales para emails
- ✅ Email de confirmación después del cambio
- ✅ Validación de contraseñas robusta
- ✅ Protección contra enumeración de usuarios
- ✅ Invalidación automática de sesiones activas

---

## Configuración

### 1. Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```bash
# Email Configuration
# Note: Email sending is currently disabled. Configure your email provider when implementing email functionality.
EMAIL_FROM_EMAIL=noreply@yourdomain.com
EMAIL_FROM_NAME=Shogun

# Password Reset Configuration
PASSWORD_RESET_URL=http://localhost:5173/reset-password
PASSWORD_RESET_TOKEN_EXPIRY=3600000  # 1 hora en milisegundos
```

### 2. Base de Datos

Los siguientes campos se agregaron automáticamente a la tabla `users`:

```sql
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMP NULL;
```

TypeORM sincronizará estos cambios automáticamente en desarrollo.

---

## Endpoints de la API

### 1. Solicitar Recuperación de Contraseña

**POST** `/auth/forgot-password`

Envía un email con un link de recuperación al usuario.

**Body:**

```json
{
  "email": "usuario@ejemplo.com"
}
```

**Respuesta Exitosa (200):**

```json
{
  "message": "Si el correo existe en nuestro sistema, recibirás un email con instrucciones para restablecer tu contraseña."
}
```

**Notas de Seguridad:**

- Siempre devuelve el mismo mensaje, aunque el email no exista
- Esto previene la enumeración de usuarios

---

### 2. Validar Token de Recuperación

**POST** `/auth/validate-reset-token`

Verifica si un token de recuperación es válido.

**Body:**

```json
{
  "token": "abc123def456..."
}
```

**Respuesta Exitosa (200):**

```json
{
  "valid": true
}
```

**Token Inválido/Expirado (200):**

```json
{
  "valid": false,
  "message": "El token es inválido o ha expirado."
}
```

---

### 3. Restablecer Contraseña

**POST** `/auth/reset-password`

Establece una nueva contraseña usando el token recibido.

**Body:**

```json
{
  "token": "abc123def456...",
  "newPassword": "MiNuevaContraseña123"
}
```

**Validaciones de Contraseña:**

- Mínimo 8 caracteres
- Al menos una letra mayúscula
- Al menos una letra minúscula
- Al menos un número

**Respuesta Exitosa (200):**

```json
{
  "message": "Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña."
}
```

**Errores:**

- `400`: Token inválido o expirado
- `403`: Cuenta desactivada

---

## Flujo de Usuario

### Diagrama del Flujo

```
┌──────────────┐
│   Usuario    │
│ olvida       │
│ contraseña   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│ POST /forgot-password   │
│ { email }               │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Sistema genera token    │
│ + fecha expiración      │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Sistema envía email     │
│ con link de reset       │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Usuario recibe email    │
│ y hace clic en link     │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Frontend valida token   │
│ POST /validate-token    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Usuario ingresa nueva   │
│ contraseña              │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ POST /reset-password    │
│ { token, newPassword }  │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Contraseña actualizada  │
│ + Email confirmación    │
│ + Sesiones invalidadas  │
└─────────────────────────┘
```

---

## Seguridad

### 1. Tokens Seguros

- Generados con `crypto.randomBytes(32)` (256 bits)
- Almacenados en texto plano en DB (para validación)
- Expiración configurable (default: 1 hora)

### 2. Protección contra Enumeración

- Siempre devuelve el mismo mensaje, exista o no el email
- No revela si una cuenta está activa/inactiva

### 3. Validación de Contraseñas

- Regex robusto: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/`
- Mínimo 8 caracteres con mayúsculas, minúsculas y números

### 4. Invalidación de Sesiones

- Al cambiar contraseña, se limpia el `refreshToken`
- Fuerza al usuario a iniciar sesión nuevamente

### 5. Limpieza de Tokens

- Los tokens se eliminan después de usarse
- Los tokens expirados no son válidos automáticamente

---

## Ejemplos de Uso

### Usando cURL

#### 1. Solicitar Recuperación

```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com"
  }'
```

#### 2. Validar Token

```bash
curl -X POST http://localhost:3000/auth/validate-reset-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123def456..."
  }'
```

#### 3. Resetear Contraseña

```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123def456...",
    "newPassword": "MiNuevaContraseña123"
  }'
```

### Usando JavaScript/TypeScript

```typescript
// 1. Solicitar recuperación
const requestReset = async (email: string) => {
  const response = await fetch('http://localhost:3000/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.json();
};

// 2. Validar token
const validateToken = async (token: string) => {
  const response = await fetch('http://localhost:3000/auth/validate-reset-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return response.json();
};

// 3. Resetear contraseña
const resetPassword = async (token: string, newPassword: string) => {
  const response = await fetch('http://localhost:3000/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  return response.json();
};
```

---

## Templates de Email

### Email de Recuperación

El email incluye:

- Logo de Shogun
- Saludo personalizado con el nombre del usuario
- Botón destacado para resetear contraseña
- Link alternativo por si el botón no funciona
- Advertencia de expiración (1 hora)
- Instrucciones de seguridad

### Email de Confirmación

Enviado después de cambiar la contraseña:

- Confirmación del cambio exitoso
- Alerta de seguridad si no fue el usuario
- Instrucciones para contactar soporte

---

## Swagger/OpenAPI

Todos los endpoints están documentados en Swagger:

```
http://localhost:3000/api
```

Busca la sección **Authentication** para ver:

- Esquemas de request/response
- Códigos de error
- Ejemplos interactivos

---

## Troubleshooting

### El email no llega

1. Verifica la configuración de email en `.env`
2. Revisa los logs del servidor para errores
3. Nota: El servicio de email está actualmente deshabilitado

### Token inválido o expirado

1. Los tokens expiran después de 1 hora (configurable)
2. Solicita un nuevo token
3. Verifica que el token en el URL esté completo

### Error al cambiar contraseña

1. Verifica que la contraseña cumpla los requisitos
2. Asegúrate de que el token sea válido
3. Confirma que la cuenta esté activa

---

## Archivos Modificados/Creados

### Nuevos Archivos

- `src/email/email.service.ts` - Servicio de email
- `src/email/email.module.ts` - Módulo de email
- `src/auth/dto/forgot-password.dto.ts` - DTO solicitud reset
- `src/auth/dto/reset-password.dto.ts` - DTO reset contraseña
- `src/auth/dto/validate-reset-token.dto.ts` - DTO validación token

### Archivos Modificados

- `src/entities/user.entity.ts` - Agregados campos de reset
- `src/users/users.service.ts` - Métodos de recuperación
- `src/auth/auth.service.ts` - Lógica de recuperación
- `src/auth/auth.controller.ts` - Endpoints de recuperación
- `src/auth/auth.module.ts` - Importación EmailModule
- `src/auth/dto/index.ts` - Exportación de DTOs
- `apps/api/.env.example` - Variables de configuración de email

---

## Próximos Pasos

Para el frontend:

1. Crear página de "Olvidé mi contraseña"
2. Crear página de "Restablecer contraseña" que reciba el token
3. Validar el token al cargar la página
4. Mostrar formulario de nueva contraseña
5. Mostrar mensajes de éxito/error

---

## Licencia

Este código es parte del proyecto Shogun.
