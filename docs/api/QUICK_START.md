# Guía de Inicio Rápido - Shogun API

Esta guía te ayudará a comenzar a usar la API de Shogun rápidamente con ejemplos prácticos y casos de uso comunes.

## Tabla de Contenidos

- [Configuración Inicial](#configuración-inicial)
- [Autenticación](#autenticación)
- [Workflow Básico](#workflow-básico)
- [Casos de Uso Comunes](#casos-de-uso-comunes)
- [Ejemplos con cURL](#ejemplos-con-curl)
- [Ejemplos con JavaScript](#ejemplos-con-javascript)
- [Troubleshooting](#troubleshooting)

## Configuración Inicial

### 1. Clonar e Instalar

```bash
# Instalar dependencias
cd apps/api
npm install
```

### 2. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus configuraciones
# Asegúrate de configurar DATABASE_URL, JWT_SECRET, etc.
```

### 3. Iniciar Base de Datos

```bash
# Con Docker Compose (recomendado)
docker-compose up -d postgres

# O crear manualmente
createdb shogun
```

### 4. Ejecutar Migraciones

```bash
npm run migration:run
```

### 5. Poblar con Datos de Ejemplo (Opcional)

```bash
npm run seed
```

### 6. Iniciar Servidor

```bash
# Modo desarrollo
npm run start:dev

# El servidor estará disponible en http://localhost:3000
# Swagger UI en http://localhost:3000/api
```

## Autenticación

### Registrar un Usuario

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu@email.com",
    "password": "TuPassword123!",
    "name": "Tu Nombre"
  }'
```

**Respuesta:**

```json
{
  "user": {
    "id": "uuid-generado",
    "email": "tu@email.com",
    "name": "Tu Nombre",
    "role": "member"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
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

### Usar el Token en Peticiones

Guarda el `accessToken` y úsalo en todas las peticiones autenticadas:

```bash
export TOKEN="tu-access-token-aqui"

curl -X GET http://localhost:3000/projects \
  -H "Authorization: Bearer $TOKEN"
```

## Workflow Básico

### Flujo Completo: Proyecto → Episodio → Secuencia → Shot → Versión

#### 1. Crear un Proyecto

```bash
curl -X POST http://localhost:3000/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ANIM_001",
    "name": "Mi Serie Animada",
    "description": "Serie de 10 episodios",
    "status": "active",
    "clientName": "Mi Cliente",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "createdBy": "tu@email.com"
  }'
```

Guarda el `id` del proyecto para usarlo después.

#### 2. Crear un Episodio

```bash
curl -X POST http://localhost:3000/episodes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "EP001",
    "name": "Episodio Piloto",
    "description": "Primer episodio de la serie",
    "status": "in_progress",
    "duration": 1440,
    "frameRate": 24,
    "projectId": "id-del-proyecto-aqui",
    "createdBy": "tu@email.com"
  }'
```

#### 3. Crear una Secuencia

```bash
curl -X POST http://localhost:3000/sequences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SEQ001",
    "name": "Secuencia de Apertura",
    "description": "Planos de apertura del episodio",
    "cutOrder": 1,
    "status": "in_progress",
    "duration": 240,
    "episodeId": "id-del-episodio-aqui",
    "createdBy": "tu@email.com"
  }'
```

#### 4. Crear un Shot

```bash
curl -X POST http://localhost:3000/shots \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SH001",
    "name": "Establishing Shot",
    "description": "Plano general de apertura",
    "sequenceNumber": 1,
    "sequenceId": "id-de-la-secuencia-aqui",
    "status": "waiting",
    "shotType": "establishing",
    "duration": 120,
    "cutOrder": 1,
    "createdBy": "tu@email.com"
  }'
```

#### 5. Crear una Versión del Shot

```bash
curl -X POST http://localhost:3000/versions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityCode": "SH001",
    "entityType": "shot",
    "code": "SH001_v001",
    "name": "Primera versión",
    "description": "Video generado con IA",
    "status": "review",
    "format": "MP4",
    "artist": "IA Generator",
    "latest": true,
    "createdBy": "tu@email.com"
  }'
```

#### 6. Subir el Video de la Versión

```bash
curl -X POST http://localhost:3000/versions/SH001_v001/file \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/ruta/a/tu/video.mp4"
```

#### 7. Subir Thumbnail de la Versión

```bash
curl -X POST http://localhost:3000/versions/SH001_v001/thumbnail \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/ruta/a/tu/thumbnail.jpg"
```

## Casos de Uso Comunes

### Crear Shot con Versión en Una Sola Operación

```bash
curl -X POST http://localhost:3000/versions/shot \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plano de Acción",
    "sequenceNumber": 2,
    "sequenceCode": "SEQ001",
    "code": "SH002",
    "description": "Plano de acción principal",
    "status": "waiting",
    "shotType": "medium",
    "duration": 90,
    "cutOrder": 2,
    "createdBy": "tu@email.com",
    "versionCode": "SH002_v001",
    "versionName": "Primera generación IA",
    "versionDescription": "Generado con Runway Gen-3",
    "versionStatus": "review",
    "format": "MP4"
  }'
```

### Crear Playlist desde Versiones Existentes

```bash
curl -X POST http://localhost:3000/playlists/from-versions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PL_REVIEW_001",
    "name": "Review Semanal",
    "description": "Versiones para revisar esta semana",
    "projectId": "id-del-proyecto",
    "versionCodes": ["SH001_v001", "SH002_v001", "SH003_v001"],
    "createdBy": "tu@email.com",
    "assignedTo": "director@studio.com"
  }'
```

### Agregar Nota de Feedback a un Shot

```bash
curl -X POST http://localhost:3000/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Ajustes en timing",
    "content": "El timing necesita ser más rápido en los frames 45-67",
    "noteType": "revision",
    "linkId": "id-del-shot",
    "linkType": "Shot",
    "isRead": false,
    "createdBy": "supervisor@studio.com",
    "assignedTo": "animator@studio.com"
  }'
```

### Buscar Todos los Shots en Estado "waiting"

```bash
curl -X GET "http://localhost:3000/shots?status=waiting" \
  -H "Authorization: Bearer $TOKEN"
```

### Buscar Versiones de un Shot Específico

```bash
curl -X GET "http://localhost:3000/versions?shotId=id-del-shot" \
  -H "Authorization: Bearer $TOKEN"
```

### Buscar Notas No Leídas de Tipo Revisión

```bash
curl -X GET "http://localhost:3000/notes?isRead=false&noteType=revision" \
  -H "Authorization: Bearer $TOKEN"
```

## Ejemplos con cURL

### Crear Asset de Personaje

```bash
curl -X POST http://localhost:3000/assets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CHAR_HERO",
    "name": "Héroe Principal",
    "assetType": "character",
    "description": "Personaje principal de la historia",
    "status": "in_progress",
    "projectId": "id-del-proyecto",
    "createdBy": "tu@email.com",
    "assignedTo": "character-designer@studio.com"
  }'
```

### Actualizar Estado de un Shot

```bash
curl -X PATCH http://localhost:3000/shots/id-del-shot \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved"
  }'
```

### Obtener Episodio con Duración Calculada

```bash
curl -X GET http://localhost:3000/episodes/EP001/duration \
  -H "Authorization: Bearer $TOKEN"
```

## Ejemplos con JavaScript

### Configuración Inicial

```javascript
const API_URL = 'http://localhost:3000';
let accessToken = '';

// Función helper para peticiones
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (accessToken) {
    options.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  return response.json();
}
```

### Registro e Inicio de Sesión

```javascript
// Registrar usuario
async function register() {
  const data = await apiRequest('/auth/register', 'POST', {
    email: 'usuario@example.com',
    password: 'Password123!',
    name: 'Nombre Usuario',
  });

  accessToken = data.tokens.accessToken;
  console.log('Usuario registrado:', data.user);
  return data;
}

// Iniciar sesión
async function login() {
  const data = await apiRequest('/auth/login', 'POST', {
    email: 'usuario@example.com',
    password: 'Password123!',
  });

  accessToken = data.tokens.accessToken;
  console.log('Sesión iniciada:', data.user);
  return data;
}
```

### Crear Proyecto

```javascript
async function crearProyecto() {
  const proyecto = await apiRequest('/projects', 'POST', {
    code: 'PROJ_001',
    name: 'Mi Proyecto',
    description: 'Descripción del proyecto',
    status: 'active',
    clientName: 'Cliente XYZ',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    createdBy: 'usuario@example.com',
  });

  console.log('Proyecto creado:', proyecto);
  return proyecto;
}
```

### Listar Proyectos con Filtros

```javascript
async function listarProyectosActivos() {
  const proyectos = await apiRequest('/projects?status=active');
  console.log('Proyectos activos:', proyectos);
  return proyectos;
}
```

### Crear Shot con Versión

```javascript
async function crearShotConVersion() {
  const shot = await apiRequest('/versions/shot', 'POST', {
    name: 'Nuevo Shot',
    sequenceNumber: 1,
    sequenceCode: 'SEQ001',
    code: 'SH001',
    status: 'waiting',
    shotType: 'establishing',
    duration: 120,
    cutOrder: 1,
    createdBy: 'usuario@example.com',
    versionCode: 'SH001_v001',
    versionName: 'Primera versión',
    versionStatus: 'review',
    format: 'MP4',
  });

  console.log('Shot creado:', shot);
  return shot;
}
```

### Subir Archivo (Video o Imagen)

```javascript
async function subirArchivoVersion(versionCode, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/versions/${versionCode}/file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const data = await response.json();
  console.log('Archivo subido:', data);
  return data;
}

// Uso con input file
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  await subirArchivoVersion('SH001_v001', file);
});
```

### Crear Playlist desde Versiones

```javascript
async function crearPlaylistReview() {
  const playlist = await apiRequest('/playlists/from-versions', 'POST', {
    code: 'PL_REVIEW_WEEK1',
    name: 'Review Semana 1',
    description: 'Versiones para revisar',
    projectId: 'id-del-proyecto',
    versionCodes: ['SH001_v001', 'SH002_v001'],
    createdBy: 'usuario@example.com',
    assignedTo: 'director@example.com',
  });

  console.log('Playlist creada:', playlist);
  return playlist;
}
```

### Agregar Nota de Feedback

```javascript
async function agregarNota(shotId) {
  const nota = await apiRequest('/notes', 'POST', {
    subject: 'Ajustes necesarios',
    content: 'El timing debe ser más rápido',
    noteType: 'revision',
    linkId: shotId,
    linkType: 'Shot',
    isRead: false,
    createdBy: 'supervisor@example.com',
    assignedTo: 'animator@example.com',
  });

  console.log('Nota creada:', nota);
  return nota;
}
```

## Troubleshooting

### Error 401: Unauthorized

**Problema:** Token no válido o expirado.

**Solución:**

```bash
# Renovar token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Authorization: Bearer $REFRESH_TOKEN"
```

### Error 404: Not Found

**Problema:** Recurso no existe o ID incorrecto.

**Solución:**

- Verifica que el ID/código sea correcto
- Asegúrate de que el recurso existe en la base de datos
- Revisa la ruta del endpoint

### Error 400: Bad Request

**Problema:** Datos de entrada inválidos.

**Solución:**

- Revisa que todos los campos requeridos estén presentes
- Verifica que los tipos de datos sean correctos
- Revisa los valores de enums (status, shotType, etc.)

### Error 500: Internal Server Error

**Problema:** Error en el servidor.

**Solución:**

- Revisa los logs del servidor
- Verifica la conexión a la base de datos
- Asegúrate de que todas las variables de entorno estén configuradas

### Problema: CORS Error en el Frontend

**Solución:**

```bash
# En .env, configura la URL del frontend
FRONTEND_URL=http://localhost:5173
```

### Problema: Base de Datos no Conecta

**Solución:**

```bash
# Verifica que PostgreSQL esté corriendo
docker-compose ps

# Verifica las credenciales en .env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=shogun
DATABASE_PASSWORD=password
DATABASE_NAME=shogun
```

### Problema: Autenticación Deshabilitada

Para desarrollo, puedes deshabilitar temporalmente la autenticación:

```bash
# En .env
AUTH_ENABLED=false
```

Verifica el estado:

```bash
curl http://localhost:3000/auth/status
```

## Recursos Adicionales

- **Swagger UI**: http://localhost:3000/api
- **API JSON**: http://localhost:3000/api-json
- **README Principal**: ../README.md
- **Documentación de NestJS**: https://docs.nestjs.com

## Próximos Pasos

1. Explora la documentación Swagger interactiva
2. Experimenta con los diferentes endpoints
3. Crea tu primer proyecto completo
4. Integra con tu aplicación frontend
5. Configura MinIO para subida de archivos

---

¿Necesitas ayuda? Revisa la documentación completa en el README principal o contacta al equipo de desarrollo.
