# Guía de Inicio Rápido - Shogunito API

Guía para comenzar a usar la API con ejemplos prácticos.

## Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

### 3. Iniciar Base de Datos

```bash
# Con Docker Compose
docker-compose up -d postgres

# O crear manualmente
createdb shogunito
```

### 4. Ejecutar Migraciones

```bash
npm run migration:run
```

### 5. Iniciar Servidor

```bash
npm run start:dev

# API: http://localhost:3000
# Swagger: http://localhost:3000/api
```

## Autenticación

### Registrar Usuario

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu@email.com",
    "password": "TuPassword123!",
    "name": "Tu Nombre"
  }'
```

### Iniciar Sesión

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu@email.com",
    "password": "TuPassword123!"
  }'
```

### Usar Token

```bash
export TOKEN="tu-access-token"

curl -X GET http://localhost:3000/projects \
  -H "Authorization: Bearer $TOKEN"
```

## Workflow Básico

### Flujo: Proyecto → Episodio → Secuencia → Versión

#### 1. Crear Proyecto

```bash
curl -X POST http://localhost:3000/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PROJ_001",
    "name": "Mi Proyecto",
    "description": "Descripción del proyecto"
  }'
```

#### 2. Crear Episodio

```bash
curl -X POST http://localhost:3000/episodes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "EP001",
    "name": "Episodio 1",
    "projectId": "ID_DEL_PROYECTO"
  }'
```

#### 3. Crear Secuencia con Versión

```bash
curl -X POST http://localhost:3000/versions/sequence \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Secuencia de Apertura",
    "episodeId": "ID_DEL_EPISODIO",
    "cutOrder": 1,
    "versionName": "Primera versión"
  }'
```

#### 4. Subir Imagen de la Versión

```bash
curl -X POST http://localhost:3000/versions/VERSION_ID/file \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/ruta/a/tu/imagen.png"
```

### Crear Asset con Versión

```bash
curl -X POST http://localhost:3000/versions/asset \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Personaje Principal",
    "assetType": "character",
    "projectId": "ID_DEL_PROYECTO",
    "versionName": "Versión inicial"
  }'
```

### Crear Playlist

```bash
curl -X POST http://localhost:3000/playlists \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PL_REVIEW_001",
    "name": "Review Semanal",
    "projectId": "ID_DEL_PROYECTO"
  }'
```

### Agregar Nota

```bash
curl -X POST http://localhost:3000/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Feedback",
    "content": "El diseño necesita ajustes",
    "noteType": "revision",
    "linkId": "ID_DE_ENTIDAD",
    "linkType": "Sequence"
  }'
```

## Ejemplos con JavaScript

```javascript
const API_URL = 'http://localhost:3000';
let accessToken = '';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  };

  const response = await fetch(`${API_URL}${endpoint}`, options);
  return response.json();
}

// Login
async function login(email, password) {
  const data = await apiRequest('/auth/login', 'POST', { email, password });
  accessToken = data.tokens.accessToken;
  return data;
}

// Crear proyecto
async function createProject(name, code) {
  return apiRequest('/projects', 'POST', { name, code });
}

// Listar proyectos
async function listProjects() {
  return apiRequest('/projects');
}

// Subir archivo
async function uploadFile(versionId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/versions/${versionId}/file`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  return response.json();
}
```

## Troubleshooting

### Error 401: Unauthorized

Token no válido o expirado. Renueva el token:

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Authorization: Bearer $REFRESH_TOKEN"
```

### Error 404: Not Found

- Verifica que el ID sea correcto
- Asegúrate de que el recurso existe

### Error 400: Bad Request

- Revisa campos requeridos
- Verifica tipos de datos
- Revisa valores de enums

### CORS Error

Configura la URL del frontend en `.env`:

```bash
FRONTEND_URL=http://localhost:5173
```

## Recursos

- **Swagger UI**: http://localhost:3000/api
- **API JSON**: http://localhost:3000/api-json
