# Formato Estandarizado de Respuestas API

Todas las respuestas de la API Shogunito siguen un formato consistente que facilita el manejo de respuestas exitosas y errores en el cliente.

## Estructura de Respuesta

### Respuesta Exitosa

```typescript
{
  "success": true,
  "data": T,              // Datos de la respuesta (cualquier tipo)
  "metadata": {
    "timestamp": string,  // ISO 8601 timestamp
    "total"?: number,     // Total de elementos (para arrays)
    "page"?: number,      // Página actual (para paginación)
    "perPage"?: number,   // Elementos por página
    "totalPages"?: number // Total de páginas
  }
}
```

### Respuesta con Error

```typescript
{
  "success": false,
  "error": {
    "code": string,       // Código de error (ej: "NOT_FOUND", "VALIDATION_ERROR")
    "message": string,    // Mensaje de error legible
    "details"?: any,      // Detalles adicionales (ej: errores de validación)
    "stack"?: string      // Stack trace (solo en desarrollo)
  },
  "metadata": {
    "timestamp": string
  }
}
```

## Ejemplos

### Ejemplo 1: GET - Obtener un Proyecto

**Request:**

```http
GET /api/v1/projects/PROJ_001
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "PROJ_001",
    "name": "Serie Animada Temporada 1",
    "description": "Producción de 12 episodios",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T14:23:45.123Z"
  }
}
```

### Ejemplo 2: GET - Listar Episodios (Array)

**Request:**

```http
GET /api/v1/episodes?projectId=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "code": "EP001_MAGIC",
      "name": "El Inicio de la Aventura",
      "epNumber": 1,
      "status": "in_progress"
    },
    {
      "id": "456e7890-e12b-34d5-a678-426614174001",
      "code": "EP002_FOREST",
      "name": "El Bosque Encantado",
      "epNumber": 2,
      "status": "waiting"
    }
  ],
  "metadata": {
    "total": 2,
    "timestamp": "2024-01-15T14:25:30.456Z"
  }
}
```

### Ejemplo 3: POST - Crear Proyecto

**Request:**

```http
POST /api/v1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "PROJ_002",
  "name": "Nueva Serie 2024",
  "description": "Proyecto de serie animada",
  "clientName": "Studio XYZ"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "789e0123-e45b-67d8-a901-426614174000",
    "code": "PROJ_002",
    "name": "Nueva Serie 2024",
    "description": "Proyecto de serie animada",
    "clientName": "Studio XYZ",
    "status": "active",
    "createdAt": "2024-01-15T14:30:00Z",
    "updatedAt": "2024-01-15T14:30:00Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T14:30:00.789Z"
  }
}
```

### Ejemplo 4: DELETE - Eliminar Proyecto

**Request:**

```http
DELETE /api/v1/projects/PROJ_001
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Proyecto eliminado exitosamente"
  },
  "metadata": {
    "timestamp": "2024-01-15T14:35:12.345Z"
  }
}
```

## Ejemplos de Errores

### Error 400: Validación Fallida

**Request:**

```http
POST /api/v1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sin código"
  // Falta el campo "code" requerido
}
```

**Response (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": ["code should not be empty", "code must be a string"]
  },
  "metadata": {
    "timestamp": "2024-01-15T14:40:00.123Z"
  }
}
```

### Error 401: No Autorizado

**Request:**

```http
GET /api/v1/projects
// Sin token de autorización
```

**Response (401 Unauthorized):**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized"
  },
  "metadata": {
    "timestamp": "2024-01-15T14:42:00.456Z"
  }
}
```

### Error 404: No Encontrado

**Request:**

```http
GET /api/v1/projects/NONEXISTENT
Authorization: Bearer <token>
```

**Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project with code NONEXISTENT not found"
  },
  "metadata": {
    "timestamp": "2024-01-15T14:45:00.789Z"
  }
}
```

### Error 409: Conflicto (Duplicado)

**Request:**

```http
POST /api/v1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "PROJ_001",  // Código ya existente
  "name": "Proyecto Duplicado"
}
```

**Response (409 Conflict):**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Project with code PROJ_001 already exists"
  },
  "metadata": {
    "timestamp": "2024-01-15T14:47:00.012Z"
  }
}
```

### Error 429: Rate Limit Excedido

**Request:**

```http
POST /api/v1/projects
Authorization: Bearer <token>
// Demasiadas peticiones en poco tiempo
```

**Response (429 Too Many Requests):**

```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "ThrottlerException: Too Many Requests"
  },
  "metadata": {
    "timestamp": "2024-01-15T14:50:00.345Z"
  }
}
```

### Error 500: Error Interno del Servidor

**Response (500 Internal Server Error):**

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "stack": "Error: ...\n    at ..." // Solo en desarrollo
  },
  "metadata": {
    "timestamp": "2024-01-15T14:52:00.678Z"
  }
}
```

## Códigos de Error Comunes

| Código                  | HTTP Status | Descripción                  |
| ----------------------- | ----------- | ---------------------------- |
| `BAD_REQUEST`           | 400         | Datos de entrada inválidos   |
| `UNAUTHORIZED`          | 401         | No autenticado (falta token) |
| `FORBIDDEN`             | 403         | Sin permisos suficientes     |
| `NOT_FOUND`             | 404         | Recurso no encontrado        |
| `CONFLICT`              | 409         | Conflicto (ej: duplicado)    |
| `UNPROCESSABLE_ENTITY`  | 422         | Entidad no procesable        |
| `TOO_MANY_REQUESTS`     | 429         | Rate limit excedido          |
| `INTERNAL_SERVER_ERROR` | 500         | Error interno del servidor   |

## Manejo en el Cliente

### TypeScript/JavaScript

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    total?: number;
    page?: number;
  };
}

// Ejemplo de uso con fetch
async function getProject(code: string): Promise<Project> {
  const response = await fetch(`/api/v1/projects/${code}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result: ApiResponse<Project> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Unknown error');
  }

  return result.data!;
}

// Manejo de errores
try {
  const project = await getProject('PROJ_001');
  console.log('Project:', project);
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Proyecto no encontrado');
  } else {
    console.error('Error:', error.message);
  }
}
```

### Axios

```typescript
import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    // Si la respuesta tiene el formato ApiResponse, extraer data
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },
  (error: AxiosError<ApiResponse>) => {
    // Manejar errores con formato ApiResponse
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new Error(`${apiError.code}: ${apiError.message}`);
    }
    throw error;
  },
);

// Uso
try {
  const project = await api.get<Project>('/projects/PROJ_001');
  console.log('Project:', project);
} catch (error) {
  console.error('Error:', error.message);
}
```

## Ventajas del Formato Estandarizado

1. **Consistencia**: Todas las respuestas siguen la misma estructura
2. **Predecibilidad**: El cliente siempre sabe qué esperar
3. **Facilidad de Debugging**: Errores con códigos y mensajes claros
4. **Metadata Útil**: Timestamps, totales, paginación incluidos
5. **Type Safety**: Fácil de tipar en TypeScript
6. **Error Handling**: Manejo uniforme de errores en el cliente
7. **Documentación**: Swagger genera docs con el formato correcto

## Implementación en el Backend

El formato estandarizado se aplica automáticamente mediante:

- **`TransformResponseInterceptor`**: Transforma respuestas exitosas
- **`HttpExceptionFilter`**: Transforma errores a formato estándar
- Aplicados globalmente en `main.ts`

Los controladores no necesitan cambios, las respuestas se transforman automáticamente.
