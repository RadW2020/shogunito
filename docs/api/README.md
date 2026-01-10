# Shogun API

API REST para el sistema de gestión de proyectos multimedia Shogun - Una plataforma completa para la producción de contenido audiovisual con integración de generación de video por IA.

## Tabla de Contenidos

- [Descripción](#descripción)
- [Tecnologías](#tecnologías)
- [Inicio Rápido](#inicio-rápido)
- [Autenticación](#autenticación)
- [Documentación Interactiva](#documentación-interactiva)
- [Modelo de Datos](#modelo-de-datos)
- [Endpoints de la API](#endpoints-de-la-api)
  - [Autenticación](#autenticación-auth)
  - [Usuarios](#usuarios-users)
  - [Proyectos](#proyectos-projects)
  - [Episodios](#episodios-episodes)
  - [Secuencias](#secuencias-sequences)
  - [Shots](#shots-shots)
  - [Assets](#assets-assets)
  - [Versiones](#versiones-versions)
  - [Playlists](#playlists-playlists)
  - [Notas](#notas-notes)
  - [Estados](#estados-statuses)
- [Filtros y Búsqueda](#filtros-y-búsqueda)
- [Gestión de Archivos](#gestión-de-archivos)
- [Control de Versiones](#control-de-versiones)
- [Códigos de Estado HTTP](#códigos-de-estado-http)
- [Variables de Entorno](#variables-de-entorno)
- [Desarrollo](#desarrollo)

## Descripción

Shogun es una API RESTful diseñada para gestionar proyectos de producción audiovisual, con soporte especializado para workflows de generación de video por IA. El sistema permite organizar proyectos en episodios, secuencias y shots, gestionar assets, controlar versiones de contenido generado por IA, y facilitar la colaboración entre equipos.

### Características Principales

- **Gestión jerárquica de proyectos**: Organización en Projects → Episodes → Sequences → Shots
- **Control de versiones multientidad**: Sistema de versionado para shots, assets, playlists y sequences
- **Integración con IA**: Metadatos especializados para contenido generado con IA (prompts, seeds, modelos, lineage)
- **Sistema de playlists**: Compilación de versiones para revisión y aprobación
- **Notas colaborativas**: Sistema de feedback con adjuntos y enlaces a cualquier entidad
- **Estados personalizables**: Definición de workflows personalizados por proyecto
- **Gestión de assets**: Personajes, props, entornos, vehículos y scripts
- **Subida de archivos**: Soporte para videos, imágenes y thumbnails
- **Autenticación JWT**: Sistema de autenticación con tokens de acceso y refresh
- **Filtros avanzados**: Búsqueda y filtrado flexible en todos los endpoints

## Tecnologías

- **Framework**: NestJS 11.0.1
- **Base de datos**: PostgreSQL con TypeORM
- **Autenticación**: JWT con Passport
- **Validación**: class-validator
- **Documentación**: Swagger/OpenAPI
- **Almacenamiento**: MinIO para archivos (videos, imágenes, thumbnails)
- **Runtime**: Node.js 20+

## Inicio Rápido

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar migraciones de base de datos
npm run migration:run

# Iniciar servidor de desarrollo
npm run start:dev
```

### Configuración de Base de Datos

```bash
# Crear base de datos PostgreSQL
createdb shogun

# Ejecutar migraciones
npm run migration:run
```

### Servidor en Ejecución

El servidor estará disponible en:

- **API**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/api
- **Especificación OpenAPI JSON**: http://localhost:3000/api-json

## Autenticación

La API utiliza autenticación JWT (JSON Web Tokens) con un sistema de tokens de acceso y refresh.

### Registro de Usuario

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Respuesta:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Uso de Tokens

Incluye el token de acceso en el header `Authorization` de tus peticiones:

```bash
GET /projects
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh de Tokens

```bash
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

### Roles y Permisos

- **admin**: Acceso completo a todos los endpoints
- **member**: Acceso a recursos propios y permisos específicos por proyecto

### Modo de Desarrollo (Sin Autenticación)

Para desarrollo, puedes deshabilitar la autenticación:

```bash
# .env
AUTH_ENABLED=false
```

Verificar el estado de autenticación:

```bash
GET /auth/status
```

## Documentación Interactiva

La API incluye documentación interactiva Swagger accesible en:

**http://localhost:3000/api**

Desde Swagger UI puedes:

- Explorar todos los endpoints disponibles
- Ver esquemas de datos y ejemplos
- Probar endpoints directamente desde el navegador
- Autenticarte usando el botón "Authorize"
- Ver códigos de respuesta y errores

## Modelo de Datos

### Jerarquía de Entidades

```
Project (Proyecto)
├── Episodes (Episodios)
│   ├── Sequences (Secuencias)
│   │   ├── Shots (Planos/Tomas)
│   │   │   ├── Versions (Versiones de shot)
│   │   │   └── Notes (Notas de feedback)
│   │   └── Versions (Versiones de secuencia)
│   └── Notes (Notas de episodio)
├── Assets (Assets del proyecto)
│   ├── Character (Personajes)
│   ├── Prop (Props/Objetos)
│   ├── Environment (Entornos)
│   ├── Vehicle (Vehículos)
│   ├── Script (Scripts)
│   ├── Versions (Versiones de asset)
│   └── Notes (Notas de asset)
└── Playlists (Compilaciones de versiones)
    ├── Versions (Versiones incluidas)
    └── Notes (Notas de playlist)

Entidades Transversales:
├── Users (Usuarios del sistema)
├── Statuses (Estados personalizados)
└── Notes (Sistema de feedback vinculado a cualquier entidad)
```

### Entidades Principales

#### Project

Contenedor principal que agrupa todos los elementos de producción de un proyecto audiovisual.

**Campos principales:**

- `code`: Código único identificador (ej: "PROJ_001")
- `name`: Nombre del proyecto
- `status`: active | bidding | onhold | completed
- `clientName`: Nombre del cliente
- `startDate`, `endDate`: Fechas del proyecto
- `createdBy`, `assignedTo`: Referencias a usuarios

#### Episode

Episodio dentro de un proyecto. Contiene múltiples secuencias que conforman el contenido narrativo.

**Campos principales:**

- `code`: Código único (ej: "EP_001")
- `name`: Nombre del episodio
- `status`: waiting | in_progress | review | approved | final
- `duration`: Duración en segundos
- `frameRate`: Frames por segundo (ej: 24, 30)
- `projectId`: Referencia al proyecto padre

#### Sequence

Secuencia o escena dentro de un episodio. Agrupa shots relacionados narrativamente.

**Campos principales:**

- `code`: Código único (ej: "SEQ_FOREST")
- `name`: Nombre de la secuencia
- `cutOrder`: Orden en el corte final
- `duration`: Duración total en segundos
- `episodeId`: Referencia al episodio padre

#### Shot

Plano o toma individual. Unidad básica de trabajo en el pipeline de producción.

**Campos principales:**

- `code`: Código único (ej: "SH001")
- `name`: Nombre del shot
- `sequenceNumber`: Número de orden en la secuencia
- `shotType`: establishing | medium | closeup | detail
- `duration`: Duración en frames o segundos
- `cutOrder`: Orden en el corte final
- `sequenceId`: Referencia a la secuencia padre

#### Version

Versión de contenido (video, imagen, etc.) asociada a cualquier entidad.

**Campos principales:**

- `code`: Código único de versión (ej: "SH001_v003")
- `name`: Nombre de la versión
- `entityCode`: Código de la entidad asociada
- `entityType`: shot | asset | playlist | sequence
- `status`: wip | review | approved | rejected
- `filePath`: Ruta del archivo principal
- `format`: Formato del archivo (MP4, PNG, EXR, etc.)
- `thumbnailPath`: Ruta del thumbnail
- `artist`: Artista o sistema generador
- `latest`: Indica si es la versión más reciente
- `publishedAt`: Fecha de publicación

**Metadatos de IA:**

- `lineage`: Historial de generación (prompt, seed, modelo)
- Campos personalizados para tracking de generaciones por IA

#### Asset

Recurso de producción reutilizable (personajes, props, entornos, etc.)

**Campos principales:**

- `code`: Código único (ej: "CHAR_HERO")
- `name`: Nombre del asset
- `assetType`: character | subtitles | imagen | audio | script | text | video
- `thumbnailPath`: Ruta de imagen de referencia
- `projectId`: Referencia al proyecto
- `versionId`: Versión actual del asset

#### Playlist

Compilación de versiones para revisión, aprobación o presentación a cliente.

**Campos principales:**

- `code`: Código único (ej: "PL_EP001_ROUGH")
- `name`: Nombre de la playlist
- `description`: Propósito de la playlist
- `status`: waiting | in_progress | review | approved | final
- `versionIds`: Array de IDs de versiones incluidas
- `projectId`: Referencia al proyecto

#### Note

Sistema de notas y feedback vinculado a cualquier entidad del sistema.

**Campos principales:**

- `subject`: Asunto de la nota
- `content`: Contenido detallado
- `noteType`: note | approval | revision | client_note
- `linkId`: ID de la entidad vinculada
- `linkType`: Project | Episode | Sequence | Shot | Version | Asset | Playlist
- `isRead`: Estado de lectura
- `attachments`: Array de archivos adjuntos
- `createdBy`, `assignedTo`: Referencias a usuarios

#### Status

Estados personalizados para workflows específicos del proyecto.

**Campos principales:**

- `code`: Código único (ej: "ANIMATION")
- `name`: Nombre del estado
- `color`: Color hexadecimal para UI
- `applicableEntities`: Array de entidades donde aplica
- `sortOrder`: Orden de clasificación
- `isActive`: Estado activo/inactivo

## Endpoints de la API

### Autenticación (/auth)

#### POST /auth/register

Registra un nuevo usuario en el sistema.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response: 201 Created**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

#### POST /auth/login

Autentica un usuario existente.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### POST /auth/logout

Cierra la sesión del usuario actual (requiere autenticación).

**Headers:**

```
Authorization: Bearer <access_token>
```

#### POST /auth/refresh

Renueva los tokens de acceso usando el refresh token.

**Headers:**

```
Authorization: Bearer <refresh_token>
```

#### GET /auth/profile

Obtiene el perfil del usuario autenticado.

**Headers:**

```
Authorization: Bearer <access_token>
```

#### GET /auth/status

Verifica el estado del servicio de autenticación.

#### GET /auth/health

Health check del servicio de autenticación.

---

### Usuarios (/users)

#### GET /users

Lista todos los usuarios del sistema (solo admin).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response: 200 OK**

```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

#### GET /users/me

Obtiene el perfil del usuario autenticado.

#### GET /users/:id

Obtiene un usuario específico por ID (solo admin).

#### PUT /users/:id

Actualiza los datos de un usuario.

**Permisos:**

- Usuarios pueden actualizar su propio perfil
- Admins pueden actualizar cualquier usuario

#### DELETE /users/:id

Elimina un usuario del sistema (solo admin).

---

### Proyectos (/projects)

#### POST /projects

Crea un nuevo proyecto.

**Request Body:**

```json
{
  "code": "PROJ_001",
  "name": "Serie Animada Temporada 1",
  "description": "Producción de 12 episodios",
  "status": "active",
  "clientName": "Netflix Studios",
  "startDate": "2024-01-15",
  "endDate": "2024-12-15",
  "createdBy": "director@studio.com",
  "assignedTo": "producer@studio.com"
}
```

**Response: 201 Created**

#### GET /projects

Lista todos los proyectos con filtros opcionales.

**Query Parameters:**

- `status` (optional): active | bidding | onhold | completed
- `clientName` (optional): Búsqueda parcial en nombre del cliente
- `createdBy` (optional): Búsqueda parcial en usuario creador
- `assignedTo` (optional): Búsqueda parcial en usuario asignado

**Ejemplos:**

```bash
GET /projects
GET /projects?status=active
GET /projects?clientName=Netflix
GET /projects?status=active&clientName=Animation
```

#### GET /projects/:id

Obtiene un proyecto específico por ID.

#### PATCH /projects/:id

Actualiza un proyecto existente.

**Request Body (campos opcionales):**

```json
{
  "name": "Nuevo nombre",
  "status": "onhold",
  "description": "Descripción actualizada"
}
```

#### DELETE /projects/:id

Elimina un proyecto y todos sus elementos asociados (cascada).

---

### Episodios (/episodes)

#### POST /episodes

Crea un nuevo episodio dentro de un proyecto.

**Request Body:**

```json
{
  "code": "EP_001",
  "name": "El Inicio de la Aventura",
  "description": "Primer episodio donde los protagonistas se conocen",
  "status": "in_progress",
  "duration": 1440,
  "frameRate": 24,
  "projectId": "uuid-del-proyecto",
  "createdBy": "director@studio.com",
  "assignedTo": "animator@studio.com"
}
```

#### GET /episodes

Lista todos los episodios con filtros opcionales.

**Query Parameters:**

- `status` (optional): waiting | in_progress | review | approved | final
- `projectId` (optional): UUID del proyecto
- `createdBy` (optional): Búsqueda parcial en usuario creador
- `assignedTo` (optional): Búsqueda parcial en usuario asignado

**Ejemplos:**

```bash
GET /episodes
GET /episodes?status=in_progress
GET /episodes?projectId=550e8400-e29b-41d4-a716-446655440000
GET /episodes?status=waiting&createdBy=director
```

#### GET /episodes/:code

Obtiene un episodio específico por código.

#### GET /episodes/:code/duration

Obtiene un episodio con la duración calculada automáticamente basada en sus secuencias.

#### PATCH /episodes/:code

Actualiza un episodio existente.

#### DELETE /episodes/:code

Elimina un episodio y todas sus secuencias y shots (cascada).

---

### Secuencias (/sequences)

#### POST /sequences

Crea una nueva secuencia dentro de un episodio.

**Request Body:**

```json
{
  "code": "SEQ_FOREST",
  "name": "Escena del Bosque Encantado",
  "description": "Los protagonistas se adentran en el bosque mágico",
  "cutOrder": 1,
  "status": "in_progress",
  "duration": 120,
  "episodeId": "uuid-del-episodio",
  "storyId": "STORY_EP01_001",
  "createdBy": "storyboard@studio.com",
  "assignedTo": "animator@studio.com"
}
```

#### GET /sequences

Lista todas las secuencias con filtros opcionales.

**Query Parameters:**

- `status` (optional): waiting | in_progress | review | approved | final
- `episodeId` (optional): UUID del episodio
- `cutOrder` (optional): Número de orden
- `createdBy` (optional): Búsqueda parcial en usuario creador
- `assignedTo` (optional): Búsqueda parcial en usuario asignado

#### GET /sequences/:id

Obtiene una secuencia específica por ID.

#### PATCH /sequences/:id

Actualiza una secuencia existente.

#### DELETE /sequences/:code

Elimina una secuencia y todos sus shots (cascada).

---

### Shots (/shots)

#### POST /shots

Crea un nuevo shot dentro de una secuencia.

**Request Body:**

```json
{
  "code": "SH001",
  "name": "Establishing Shot",
  "description": "Plano general que establece la ubicación principal de la escena",
  "sequenceNumber": 1,
  "sequenceId": "uuid-de-la-secuencia",
  "status": "waiting",
  "shotType": "establishing",
  "duration": 120,
  "cutOrder": 1,
  "createdBy": "layout@studio.com",
  "assignedTo": "animator@studio.com"
}
```

#### GET /shots

Lista todos los shots con filtros opcionales.

**Query Parameters:**

- `status` (optional): waiting | in_progress | review | approved | final
- `shotType` (optional): establishing | medium | closeup | detail
- `sequenceId` (optional): UUID de la secuencia
- `cutOrder` (optional): Número de orden
- `sequenceNumber` (optional): Número de secuencia
- `createdBy` (optional): Búsqueda parcial en usuario creador
- `assignedTo` (optional): Búsqueda parcial en usuario asignado

**Ejemplos:**

```bash
GET /shots
GET /shots?shotType=closeup
GET /shots?status=waiting&sequenceId=uuid
GET /shots?cutOrder=1
```

#### GET /shots/:id

Obtiene un shot específico por ID, incluyendo todas sus versiones.

#### PATCH /shots/:id

Actualiza un shot existente.

#### DELETE /shots/:id

Elimina un shot y todas sus versiones (cascada).

---

### Assets (/assets)

#### POST /assets

Crea un nuevo asset del proyecto.

**Request Body:**

```json
{
  "code": "CHAR_HERO",
  "name": "Personaje Principal",
  "assetType": "character",
  "description": "Modelo 3D del protagonista con rig completo para animación",
  "status": "waiting",
  "projectId": "uuid-del-proyecto",
  "createdBy": "character-designer@studio.com",
  "assignedTo": "modeler@studio.com"
}
```

**Tipos de Assets:**

- `character`: Personajes
- `prop`: Props/Objetos
- `environment`: Entornos
- `vehicle`: Vehículos
- `script`: Scripts

#### GET /assets

Lista todos los assets con filtros opcionales.

**Query Parameters:**

- `status` (optional): waiting | in_progress | review | approved | final
- `assetType` (optional): character | subtitles | imagen | audio | script | text | video
- `projectId` (optional): UUID del proyecto
- `versionId` (optional): UUID de la versión
- `createdBy` (optional): Búsqueda parcial en usuario creador
- `assignedTo` (optional): Búsqueda parcial en usuario asignado

**Ejemplos:**

```bash
GET /assets
GET /assets?assetType=character
GET /assets?status=approved&assetType=imagen
GET /assets?assetType=audio&projectId=123
GET /assets?projectId=uuid
```

#### GET /assets/:code

Obtiene un asset específico por código.

#### PATCH /assets/:code

Actualiza un asset existente.

#### DELETE /assets/:code

Elimina un asset del sistema.

#### POST /assets/:code/thumbnail

Sube un thumbnail para el asset.

**Request:**

```
Content-Type: multipart/form-data

file: [imagen]
```

---

### Versiones (/versions)

El sistema de versiones es multientidad, permitiendo crear versiones asociadas a shots, assets, playlists o sequences.

#### POST /versions

Crea una nueva versión genérica asociada a cualquier entidad.

**Request Body:**

```json
{
  "entityCode": "SH001",
  "entityType": "shot",
  "code": "SH001_003",
  "name": "Plano del Bosque - Iteración 3",
  "description": "Video generado con IA usando Runway Gen-3",
  "status": "review",
  "filePath": "/uploads/versions/SH001_003.mp4",
  "format": "MP4",
  "frameRange": "1-240",
  "artist": "IA Generator",
  "createdBy": "ai-operator@studio.com",
  "assignedTo": "director@studio.com",
  "thumbnailPath": "/uploads/thumbnails/version_123.jpg",
  "latest": true,
  "publishedAt": "2024-01-15T16:30:00Z",
  "lineage": "prompt: \"cinematic shot of enchanted forest, camera dolly forward\", seed: 12345, model: runway-gen3"
}
```

**Tipos de entidad soportados:**

- `shot`: Versiones de shots
- `asset`: Versiones de assets
- `playlist`: Versiones de playlists
- `sequence`: Versiones de sequences

#### POST /versions/shot

Crea un shot nuevo junto con su primera versión en una sola transacción.

**Request Body:**

```json
{
  "name": "Plano de Apertura - Bosque",
  "sequenceNumber": 5,
  "sequenceCode": "SEQ_FOREST",
  "code": "SH005",
  "description": "Plano general de apertura - bosque encantado al amanecer",
  "status": "waiting",
  "shotType": "establishing",
  "duration": 120,
  "cutOrder": 3,
  "createdBy": "ai-operator@studio.com",
  "assignedTo": "director@studio.com",
  "versionCode": "SH005_001",
  "versionName": "Primera generación IA",
  "versionDescription": "Video generado con Runway Gen-3",
  "versionStatus": "review",
  "filePath": "/uploads/versions/SH005_001.mp4",
  "format": "MP4"
}
```

#### POST /versions/asset

Crea un asset nuevo junto con su primera versión.

#### POST /versions/playlist

Crea una playlist nueva junto con su primera versión.

#### POST /versions/sequence

Crea una secuencia nueva junto con su primera versión.

#### GET /versions

Lista todas las versiones con filtros opcionales.

**Query Parameters:**

- `shotId` (optional): UUID del shot
- `assetId` (optional): UUID del asset
- `playlistId` (optional): UUID de la playlist
- `sequenceId` (optional): UUID de la secuencia

**Ejemplos:**

```bash
GET /versions
GET /versions?shotId=uuid
GET /versions?assetId=uuid&status=approved
```

#### GET /versions/:code

Obtiene una versión específica por código.

#### PATCH /versions/:code

Actualiza los metadatos de una versión.

#### DELETE /versions/:code

Elimina una versión del sistema.

#### POST /versions/:code/thumbnail

Sube un thumbnail para la versión.

**Request:**

```
Content-Type: multipart/form-data

file: [imagen]
```

#### POST /versions/:code/file

Sube el archivo principal de la versión (video, imagen, etc.)

**Request:**

```
Content-Type: multipart/form-data

file: [archivo de video/imagen]
```

---

### Playlists (/playlists)

#### POST /playlists

Crea una nueva playlist.

**Request Body:**

```json
{
  "code": "PL_EP002_ROUGH",
  "name": "Episode 2 - Rough Cut Review",
  "description": "Playlist con el rough cut del episodio 2 para revisión interna",
  "status": "waiting",
  "projectId": "uuid-del-proyecto",
  "versionIds": ["uuid-version-1", "uuid-version-2"],
  "createdBy": "editor@studio.com",
  "assignedTo": "director@studio.com"
}
```

#### POST /playlists/from-versions

Crea una playlist a partir de códigos de versiones seleccionadas.

**Request Body:**

```json
{
  "code": "PL_CLIENT_REVIEW",
  "name": "Client Review - Week 3",
  "description": "Versiones seleccionadas para revisión con cliente",
  "projectId": "uuid-del-proyecto",
  "versionCodes": ["SH001_003", "SH002_002", "SH003_001"],
  "createdBy": "supervisor@studio.com",
  "assignedTo": "client@studio.com"
}
```

#### GET /playlists

Lista todas las playlists con filtros opcionales.

**Query Parameters:**

- `status` (optional): waiting | in_progress | review | approved | final
- `projectId` (optional): UUID del proyecto
- `createdBy` (optional): Búsqueda parcial en usuario creador
- `assignedTo` (optional): Búsqueda parcial en usuario asignado
- `code` (optional): Búsqueda parcial en código
- `name` (optional): Búsqueda parcial en nombre

#### GET /playlists/:id

Obtiene una playlist específica con todas sus versiones.

#### PATCH /playlists/:id

Actualiza los metadatos de una playlist.

#### DELETE /playlists/:code

Elimina una playlist del sistema.

#### POST /playlists/:code/versions

Agrega una versión a una playlist existente.

**Request Body:**

```json
{
  "versionCode": "SH004_001"
}
```

#### DELETE /playlists/:code/versions/:versionCode

Elimina una versión específica de una playlist.

#### PUT /playlists/:code/versions/reorder

Reordena las versiones dentro de una playlist.

**Request Body:**

```json
{
  "versionCodes": ["SH003_001", "SH001_003", "SH002_002"]
}
```

---

### Notas (/notes)

Sistema de notas y feedback que puede vincularse a cualquier entidad del sistema.

#### POST /notes

Crea una nueva nota vinculada a una entidad.

**Request Body:**

```json
{
  "subject": "Ajustes en la animación",
  "content": "El timing del personaje necesita ajustes en los frames 45-67. La acción debe ser más rápida para mantener el ritmo de la escena.",
  "noteType": "revision",
  "linkId": "uuid-del-shot",
  "linkType": "Shot",
  "isRead": false,
  "createdBy": "supervisor@studio.com",
  "assignedTo": "animator@studio.com"
}
```

**Tipos de Nota:**

- `note`: Nota general
- `approval`: Aprobación
- `revision`: Solicitud de revisión
- `client_note`: Nota de cliente

**Tipos de Entidad (linkType):**

- `Project`
- `Episode`
- `Sequence`
- `Shot`
- `Version`
- `Asset`
- `Playlist`

#### GET /notes

Lista todas las notas con filtros opcionales.

**Query Parameters:**

- `linkId` (optional): UUID de la entidad vinculada
- `linkType` (optional): Tipo de entidad vinculada
- `noteType` (optional): Tipo de nota
- `isRead` (optional): Estado de lectura (true/false)
- `createdBy` (optional): Búsqueda parcial en usuario creador
- `assignedTo` (optional): Búsqueda parcial en usuario asignado
- `subject` (optional): Búsqueda parcial en asunto
- `content` (optional): Búsqueda parcial en contenido
- `hasAttachments` (optional): Filtrar por notas con/sin adjuntos (true/false)

**Ejemplos:**

```bash
GET /notes
GET /notes?linkId=uuid&linkType=Shot
GET /notes?isRead=false&noteType=revision
GET /notes?subject=animación&hasAttachments=true
```

#### GET /notes/:id

Obtiene una nota específica por ID.

#### PATCH /notes/:id

Actualiza una nota existente.

**Request Body (campos opcionales):**

```json
{
  "subject": "Nuevo asunto",
  "content": "Contenido actualizado",
  "isRead": true
}
```

#### DELETE /notes/:id

Elimina una nota del sistema.

#### POST /notes/:id/attachments

Sube un archivo adjunto a una nota.

**Request:**

```
Content-Type: multipart/form-data

file: [archivo]
```

#### DELETE /notes/:id/attachments/:attachmentId

Elimina un archivo adjunto de una nota.

---

### Estados (/statuses)

Sistema de estados personalizados para workflows específicos del proyecto.

#### POST /statuses

Crea un nuevo estado personalizado.

**Request Body:**

```json
{
  "code": "ANIMATION",
  "name": "En Animación",
  "description": "El shot está en proceso de animación",
  "color": "#8B5CF6",
  "isActive": true,
  "sortOrder": 15,
  "applicableEntities": ["shot", "sequence"],
  "createdBy": "supervisor@studio.com",
  "assignedTo": "lead-animator@studio.com"
}
```

**Entidades Aplicables:**

- `project`: Proyectos
- `episode`: Episodios
- `sequence`: Secuencias
- `shot`: Shots
- `version`: Versiones
- `asset`: Assets
- `note`: Notas
- `all`: Todas las entidades

#### GET /statuses

Lista todos los estados con filtros opcionales.

**Query Parameters:**

- `isActive` (optional): Filtrar por activo/inactivo (true/false)
- `applicableEntities` (optional): Filtrar por entidades aplicables
- `color` (optional): Filtrar por color hexadecimal
- `createdBy` (optional): Búsqueda parcial en usuario creador
- `assignedTo` (optional): Búsqueda parcial en usuario asignado
- `code` (optional): Búsqueda parcial en código
- `name` (optional): Búsqueda parcial en nombre

**Ejemplos:**

```bash
GET /statuses
GET /statuses?isActive=true
GET /statuses?applicableEntities=shot,asset
GET /statuses?color=%238B5CF6
```

#### GET /statuses/:id

Obtiene un estado específico por ID.

#### PATCH /statuses/:id

Actualiza un estado existente.

#### DELETE /statuses/:id

Elimina un estado del sistema.

---

## Filtros y Búsqueda

Todos los endpoints de listado soportan filtros opcionales a través de query parameters.

### Tipos de Filtros

#### Filtros Exactos

Buscan coincidencia exacta del valor.

**Ejemplos:**

- `status=active`
- `projectId=uuid`
- `isActive=true`

#### Filtros de Búsqueda Parcial (ILIKE)

Buscan coincidencias parciales, insensibles a mayúsculas.

**Ejemplos:**

- `clientName=Netflix` → Encuentra "Netflix Studios", "netflix", "NETFLIX"
- `createdBy=director` → Encuentra "director@studio.com", "Director Assistant"

#### Filtros Booleanos

Valores: `true` o `false`

**Ejemplos:**

- `isActive=true`
- `isRead=false`
- `hasAttachments=true`

#### Filtros Numéricos

Valores numéricos exactos.

**Ejemplos:**

- `cutOrder=1`
- `sequenceNumber=5`

### Combinación de Filtros

Múltiples filtros se pueden combinar en una sola petición:

```bash
GET /projects?status=active&clientName=Netflix
GET /notes?isRead=false&noteType=revision&hasAttachments=true
GET /shots?status=waiting&shotType=closeup&sequenceId=uuid
```

### Ejemplos de Búsqueda

#### Buscar proyectos activos de un cliente específico

```bash
GET /projects?status=active&clientName=Netflix
```

#### Buscar notas no leídas de tipo revisión

```bash
GET /notes?isRead=false&noteType=revision
```

#### Buscar shots de tipo closeup en estado waiting

```bash
GET /shots?shotType=closeup&status=waiting
```

#### Buscar versiones aprobadas de un shot específico

```bash
GET /versions?shotId=uuid&status=approved
```

#### Buscar assets de tipo character en progreso

```bash
GET /assets?assetType=character&status=in_progress
```

## Gestión de Archivos

La API soporta subida y gestión de archivos multimedia a través de MinIO.

### Tipos de Archivos Soportados

- **Videos**: MP4, MOV, AVI, MKV (para versiones de shots/sequences)
- **Imágenes**: PNG, JPG, JPEG, WEBP, EXR (para thumbnails y concept art)
- **Documentos**: PDF (para scripts)

### Endpoints de Subida

#### Subir archivo de versión

```bash
POST /versions/:code/file
Content-Type: multipart/form-data

file: [archivo de video/imagen]
```

#### Subir thumbnail de versión

```bash
POST /versions/:code/thumbnail
Content-Type: multipart/form-data

file: [imagen]
```

#### Subir thumbnail de asset

```bash
POST /assets/:code/thumbnail
Content-Type: multipart/form-data

file: [imagen]
```

#### Subir adjunto a nota

```bash
POST /notes/:id/attachments
Content-Type: multipart/form-data

file: [cualquier tipo de archivo]
```

### Ejemplo con cURL

```bash
curl -X POST http://localhost:3000/versions/SH001_003/file \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@/path/to/video.mp4"
```

### Ejemplo con JavaScript (fetch)

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('http://localhost:3000/versions/SH001_003/file', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + accessToken,
  },
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

## Control de Versiones

El sistema incluye un potente control de versiones multientidad para gestionar iteraciones de contenido.

### Flujo de Trabajo de Versiones

1. **Creación**: Se crea una versión vinculada a una entidad (shot, asset, etc.)
2. **Subida de archivo**: Se sube el archivo principal (video, imagen)
3. **Subida de thumbnail**: Se sube una miniatura de previsualización
4. **Revisión**: La versión pasa por workflow de aprobación
5. **Marcado como latest**: Una versión aprobada se marca como "latest"
6. **Publicación**: Se establece `publishedAt` cuando está lista

### Estados de Versión

- `wip`: Work in Progress - En desarrollo
- `review`: En revisión
- `approved`: Aprobada
- `rejected`: Rechazada

### Metadatos de IA

Para contenido generado con IA, las versiones pueden incluir:

- `lineage`: Historial completo de generación
  - Prompt utilizado
  - Seed/semilla
  - Modelo de IA usado
  - Parámetros de generación
  - Referencias a versiones anteriores

**Ejemplo de lineage:**

```json
{
  "lineage": "prompt: 'cinematic shot of enchanted forest, camera dolly forward, golden hour lighting', seed: 12345, model: 'runway-gen3-turbo', cfg_scale: 7.5, steps: 50, parent_version: 'SH001_002'"
}
```

### Gestión de Versiones Latest

Solo una versión puede estar marcada como `latest: true` por entidad. Al marcar una nueva versión como latest, las anteriores se actualizan automáticamente.

### Creación Atómica de Entidad + Versión

Los endpoints especiales permiten crear una entidad y su primera versión en una sola transacción:

```bash
POST /versions/shot      # Crea shot + versión
POST /versions/asset     # Crea asset + versión
POST /versions/playlist  # Crea playlist + versión
POST /versions/sequence  # Crea sequence + versión
```

## Códigos de Estado HTTP

La API utiliza los siguientes códigos de estado HTTP:

### Códigos de Éxito (2xx)

- **200 OK**: Petición exitosa (GET, PATCH, DELETE)
- **201 Created**: Recurso creado exitosamente (POST)
- **204 No Content**: Petición exitosa sin contenido de respuesta

### Códigos de Error del Cliente (4xx)

- **400 Bad Request**: Datos de entrada inválidos o validación fallida
- **401 Unauthorized**: No autenticado o token inválido
- **403 Forbidden**: Autenticado pero sin permisos suficientes
- **404 Not Found**: Recurso no encontrado
- **409 Conflict**: Conflicto con estado actual (ej: código duplicado)

### Códigos de Error del Servidor (5xx)

- **500 Internal Server Error**: Error interno del servidor

### Formato de Respuestas de Error

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": ["code should not be empty", "name must be a string"]
}
```

## Variables de Entorno

La API requiere las siguientes variables de entorno:

```bash
# Base de datos PostgreSQL
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=shogun
DATABASE_PASSWORD=password
DATABASE_NAME=shogun

# Autenticación JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# Autenticación (habilitar/deshabilitar)
AUTH_ENABLED=true

# Frontend (CORS)
FRONTEND_URL=http://localhost:5173

# Servidor
PORT=3000

# MinIO (almacenamiento de archivos)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=shogun-media
MINIO_USE_SSL=false

# Entorno
NODE_ENV=development
```

## Desarrollo

### Ejecutar Pruebas

```bash
# Pruebas unitarias
npm run test

# Pruebas e2e
npm run test:e2e

# Cobertura de código
npm run test:cov
```

### Modo Watch (desarrollo)

```bash
npm run start:dev
```

### Construcción para Producción

```bash
npm run build
npm run start:prod
```

### Migraciones de Base de Datos

```bash
# Generar nueva migración
npm run migration:generate -- -n MigrationName

# Ejecutar migraciones pendientes
npm run migration:run

# Revertir última migración
npm run migration:revert
```

### Poblar Base de Datos

```bash
# Ejecutar seeders
npm run seed
```

### Linting y Formato

```bash
# Lint
npm run lint

# Formato
npm run format
```

## Especificación OpenAPI

La especificación completa de OpenAPI está disponible en:

- **JSON**: http://localhost:3000/api-json
- **Swagger UI**: http://localhost:3000/api

Para exportar la especificación:

```bash
curl http://localhost:3000/api-json > openapi.json
```

## Soporte y Contribución

Para reportar problemas o contribuir al proyecto, por favor contacta al equipo de desarrollo.

## Licencia

[Especificar licencia del proyecto]

---

**Shogun API** - Sistema de gestión de proyectos multimedia con integración de IA
