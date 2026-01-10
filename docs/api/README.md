# Shogunito API

API REST para gestión de proyectos de producción de contenido visual con integración de IA.

## Tabla de Contenidos

- [Descripción](#descripción)
- [Tecnologías](#tecnologías)
- [Inicio Rápido](#inicio-rápido)
- [Autenticación](#autenticación)
- [Modelo de Datos](#modelo-de-datos)
- [Endpoints de la API](#endpoints-de-la-api)
- [Variables de Entorno](#variables-de-entorno)

## Descripción

Shogunito es una API RESTful para gestionar proyectos de producción de contenido visual, con soporte para workflows de generación de imágenes por IA.

### Características Principales

- **Gestión jerárquica**: Projects → Episodes → Sequences
- **Control de versiones**: Sistema de versionado para sequences, assets y playlists
- **Integración con IA**: Metadatos para contenido generado (prompts, seeds, lineage)
- **Sistema de playlists**: Compilación de versiones para revisión
- **Notas colaborativas**: Feedback vinculado a cualquier entidad
- **Estados personalizables**: Workflows personalizados
- **Gestión de assets**: Imágenes, subtítulos, audio, scripts, texto
- **Subida de archivos**: Integración con MinIO
- **Autenticación JWT**: Tokens de acceso y refresh
- **Permisos por proyecto**: owner, contributor, viewer

## Tecnologías

- **Framework**: NestJS 11
- **Base de datos**: PostgreSQL + TypeORM
- **Autenticación**: JWT + Passport
- **Almacenamiento**: MinIO
- **Documentación**: Swagger/OpenAPI

## Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar migraciones
npm run migration:run

# Iniciar servidor
npm run start:dev
```

**URLs del servidor:**
- **API**: http://localhost:3000
- **Swagger**: http://localhost:3000/api

## Autenticación

### Registro

```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

### Login

```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Uso de Tokens

```bash
GET /projects
Authorization: Bearer <access_token>
```

### Roles

- **admin**: Acceso completo
- **director**: Gestión de proyectos
- **artist**: Creación de contenido
- **member**: Acceso básico

### Permisos por Proyecto

- **owner**: Control total del proyecto
- **contributor**: Crear y editar contenido
- **viewer**: Solo lectura

## Modelo de Datos

### Jerarquía de Entidades

```
Project
├── Episodes
│   └── Sequences
│       └── Versions
├── Assets
│   └── Versions
└── Playlists
    └── Versions

Entidades Transversales:
├── Users
├── Statuses
├── Notes
└── ProjectPermissions
```

### Entidades Principales

| Entidad | Descripción |
|---------|-------------|
| **Project** | Contenedor principal del proyecto |
| **Episode** | Episodio dentro de un proyecto |
| **Sequence** | Secuencia/escena dentro de un episodio |
| **Asset** | Recurso reutilizable (imagen, audio, script, etc.) |
| **Version** | Versión de contenido con metadatos de IA |
| **Playlist** | Compilación de versiones para revisión |
| **Note** | Feedback vinculado a cualquier entidad |
| **Status** | Estados personalizables para workflows |

### Tipos de Assets

- `character` - Personajes
- `subtitles` - Subtítulos
- `imagen` - Imágenes
- `audio` - Audio
- `script` - Scripts
- `text` - Texto

## Endpoints de la API

### Autenticación (`/auth`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registro de usuario |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| POST | `/auth/refresh` | Renovar tokens |
| GET | `/auth/profile` | Perfil del usuario |
| GET | `/auth/status` | Estado del servicio |

### Usuarios (`/users`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/users` | Listar usuarios (admin) |
| GET | `/users/me` | Mi perfil |
| GET | `/users/:id` | Obtener usuario |
| PUT | `/users/:id` | Actualizar usuario |
| DELETE | `/users/:id` | Eliminar usuario (admin) |

### Proyectos (`/projects`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/projects` | Crear proyecto |
| GET | `/projects` | Listar proyectos |
| GET | `/projects/:id` | Obtener proyecto |
| PATCH | `/projects/:id` | Actualizar proyecto |
| DELETE | `/projects/:id` | Eliminar proyecto |

### Episodios (`/episodes`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/episodes` | Crear episodio |
| GET | `/episodes` | Listar episodios |
| GET | `/episodes/:code` | Obtener episodio |
| PATCH | `/episodes/:code` | Actualizar episodio |
| DELETE | `/episodes/:code` | Eliminar episodio |

### Secuencias (`/sequences`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/sequences` | Crear secuencia |
| GET | `/sequences` | Listar secuencias |
| GET | `/sequences/:id` | Obtener secuencia |
| PATCH | `/sequences/:id` | Actualizar secuencia |
| DELETE | `/sequences/:id` | Eliminar secuencia |

### Assets (`/assets`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/assets` | Crear asset |
| GET | `/assets` | Listar assets |
| GET | `/assets/:code` | Obtener asset |
| PATCH | `/assets/:code` | Actualizar asset |
| DELETE | `/assets/:code` | Eliminar asset |
| POST | `/assets/:code/thumbnail` | Subir thumbnail |

### Versiones (`/versions`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/versions` | Crear versión |
| GET | `/versions` | Listar versiones |
| GET | `/versions/:id` | Obtener versión |
| PATCH | `/versions/:id` | Actualizar versión |
| DELETE | `/versions/:id` | Eliminar versión |
| POST | `/versions/:id/file` | Subir archivo |
| POST | `/versions/:id/thumbnail` | Subir thumbnail |
| POST | `/versions/asset` | Crear asset con versión |
| POST | `/versions/playlist` | Crear playlist con versión |
| POST | `/versions/sequence` | Crear secuencia con versión |

### Playlists (`/playlists`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/playlists` | Crear playlist |
| GET | `/playlists` | Listar playlists |
| GET | `/playlists/:code` | Obtener playlist |
| PATCH | `/playlists/:code` | Actualizar playlist |
| DELETE | `/playlists/:code` | Eliminar playlist |

### Notas (`/notes`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/notes` | Crear nota |
| GET | `/notes` | Listar notas |
| GET | `/notes/:id` | Obtener nota |
| PATCH | `/notes/:id` | Actualizar nota |
| DELETE | `/notes/:id` | Eliminar nota |

### Estados (`/statuses`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/statuses` | Crear estado |
| GET | `/statuses` | Listar estados |
| GET | `/statuses/:id` | Obtener estado |
| PATCH | `/statuses/:id` | Actualizar estado |
| DELETE | `/statuses/:id` | Eliminar estado |

### Búsqueda (`/search`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/search?q=query` | Búsqueda global |
| GET | `/search?q=query&entity=type` | Búsqueda por entidad |

### Health (`/health`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado general |
| GET | `/health/db` | Estado de BD |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/live` | Liveness probe |

## Variables de Entorno

```bash
# Base de datos
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=shogunito

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=shogunito

# Opcional
AUTH_ENABLED=true
NODE_ENV=development
```

---

**Documentación Swagger:** http://localhost:3000/api
