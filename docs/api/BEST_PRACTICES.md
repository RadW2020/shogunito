# Mejores Prácticas - Shogun API

Guía de mejores prácticas para el desarrollo con la API de Shogun.

## Tabla de Contenidos

- [Autenticación y Seguridad](#autenticación-y-seguridad)
- [Gestión de Errores](#gestión-de-errores)
- [Optimización de Peticiones](#optimización-de-peticiones)
- [Workflow de Versiones](#workflow-de-versiones)
- [Organización de Proyectos](#organización-de-proyectos)
- [Subida de Archivos](#subida-de-archivos)
- [Búsqueda y Filtrado](#búsqueda-y-filtrado)
- [Colaboración y Notas](#colaboración-y-notas)
- [Performance](#performance)
- [Testing](#testing)

## Autenticación y Seguridad

### Gestión de Tokens

**Recomendado:**

```javascript
// Almacenar tokens de forma segura
const tokenManager = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setTokens: (access, refresh) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  },
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// Interceptor para renovar tokens automáticamente
async function apiRequest(url, options = {}) {
  let token = tokenManager.getAccessToken();

  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  let response = await fetch(url, options);

  // Si el token expiró, renovarlo
  if (response.status === 401) {
    const refreshToken = tokenManager.getRefreshToken();
    const refreshResponse = await fetch('/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (refreshResponse.ok) {
      const { accessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
      tokenManager.setTokens(accessToken, newRefreshToken);

      // Reintentar petición original
      options.headers['Authorization'] = `Bearer ${accessToken}`;
      response = await fetch(url, options);
    } else {
      // Refresh token inválido, redirigir a login
      tokenManager.clearTokens();
      window.location.href = '/login';
    }
  }

  return response;
}
```

**No Recomendado:**

```javascript
// ❌ Almacenar tokens en variables globales
window.accessToken = 'token';

// ❌ No manejar expiración de tokens
fetch('/projects', {
  headers: { Authorization: 'Bearer ' + token },
});
```

### Contraseñas Seguras

**Recomendado:**

- Mínimo 8 caracteres
- Incluir mayúsculas, minúsculas, números y símbolos
- Usar validación en el cliente antes de enviar

```javascript
function validarPassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}
```

### Protección de Endpoints

**Recomendado:**

- Siempre enviar el token en el header `Authorization`
- Verificar permisos en el backend
- Usar HTTPS en producción

## Gestión de Errores

### Manejo Robusto de Errores

**Recomendado:**

```javascript
async function crearProyecto(data) {
  try {
    const response = await apiRequest('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();

      // Manejar errores específicos
      switch (response.status) {
        case 400:
          throw new Error(`Datos inválidos: ${error.message}`);
        case 401:
          throw new Error('No autenticado');
        case 403:
          throw new Error('Sin permisos');
        case 409:
          throw new Error('El código del proyecto ya existe');
        case 500:
          throw new Error('Error del servidor');
        default:
          throw new Error(error.message || 'Error desconocido');
      }
    }

    return await response.json();
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    // Mostrar mensaje al usuario
    mostrarNotificacion('error', error.message);
    throw error;
  }
}
```

**No Recomendado:**

```javascript
// ❌ No manejar errores
async function crearProyecto(data) {
  const response = await fetch('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}
```

### Validación en el Cliente

**Recomendado:**

```javascript
function validarProyecto(data) {
  const errores = [];

  if (!data.code || data.code.trim() === '') {
    errores.push('El código es requerido');
  }

  if (!data.name || data.name.trim() === '') {
    errores.push('El nombre es requerido');
  }

  if (!['active', 'bidding', 'onhold', 'completed'].includes(data.status)) {
    errores.push('Estado inválido');
  }

  if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
    errores.push('La fecha de inicio debe ser anterior a la fecha de fin');
  }

  return errores;
}

// Usar antes de enviar
const errores = validarProyecto(datosProyecto);
if (errores.length > 0) {
  mostrarErrores(errores);
  return;
}

await crearProyecto(datosProyecto);
```

## Optimización de Peticiones

### Usar Filtros Eficientemente

**Recomendado:**

```javascript
// Cargar solo los datos necesarios
const shotsEnEspera = await apiRequest('/shots?status=waiting&sequenceId=uuid&limit=10');

// Combinar filtros para reducir datos transferidos
const versionesRecientes = await apiRequest('/versions?shotId=uuid&status=approved&latest=true');
```

**No Recomendado:**

```javascript
// ❌ Cargar todos los datos y filtrar en el cliente
const todosShots = await apiRequest('/shots');
const shotsEnEspera = todosShots.filter((s) => s.status === 'waiting');
```

### Cachear Datos cuando Sea Apropiado

**Recomendado:**

```javascript
class APICache {
  constructor(ttl = 5 * 60 * 1000) {
    // 5 minutos por defecto
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl,
    });
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new APICache();

async function obtenerProyectos() {
  const cached = cache.get('projects');
  if (cached) return cached;

  const projects = await apiRequest('/projects');
  cache.set('projects', projects);
  return projects;
}
```

### Debouncing en Búsquedas

**Recomendado:**

```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Búsqueda con debounce
const buscarNotas = debounce(async (termino) => {
  const notas = await apiRequest(`/notes?content=${encodeURIComponent(termino)}`);
  mostrarResultados(notas);
}, 300);

// Uso
inputBusqueda.addEventListener('input', (e) => {
  buscarNotas(e.target.value);
});
```

## Workflow de Versiones

### Nombrado de Versiones

**Recomendado:**

```javascript
// Usar nomenclatura consistente
const versionCode = `${shotCode}_v${numeroVersion.toString().padStart(3, '0')}`;
// Ejemplo: SH001_v001, SH001_v002, etc.

// Incluir metadatos descriptivos
const versionData = {
  code: versionCode,
  name: `${shotName} - Versión ${numeroVersion}`,
  description: 'Descripción clara de los cambios en esta versión',
  artist: 'Nombre del artista o sistema',
  lineage: JSON.stringify({
    prompt: 'prompt usado',
    seed: 12345,
    model: 'runway-gen3',
    parent_version: 'SH001_v001',
  }),
};
```

### Gestión de Versión "Latest"

**Recomendado:**

```javascript
// Solo marcar como latest cuando está aprobada
async function aprobarVersion(versionCode) {
  // 1. Actualizar estado a approved
  await apiRequest(`/versions/${versionCode}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'approved' }),
  });

  // 2. Marcar como latest
  await apiRequest(`/versions/${versionCode}`, {
    method: 'PATCH',
    body: JSON.stringify({
      latest: true,
      publishedAt: new Date().toISOString(),
    }),
  });
}
```

### Tracking de Generaciones IA

**Recomendado:**

```javascript
// Documentar completamente el proceso de generación
const versionIA = {
  code: 'SH001_v003',
  name: 'Shot Bosque - Generación IA v3',
  description: 'Tercera iteración con ajustes en iluminación',
  status: 'review',
  artist: 'AI Generator - Runway Gen-3',
  lineage: JSON.stringify({
    prompt:
      'cinematic shot of enchanted forest, camera dolly forward, golden hour lighting, mystical atmosphere',
    seed: 42,
    model: 'runway-gen3-turbo',
    cfg_scale: 7.5,
    steps: 50,
    resolution: '1920x1080',
    parent_version: 'SH001_v002',
    iterations: [
      { timestamp: '2024-01-15T10:00:00Z', changes: 'Initial generation' },
      {
        timestamp: '2024-01-15T11:30:00Z',
        changes: 'Adjusted lighting parameters',
      },
    ],
  }),
  createdBy: 'ai-operator@studio.com',
  assignedTo: 'director@studio.com',
};
```

## Organización de Proyectos

### Estructura de Códigos

**Recomendado:**

```javascript
// Usar códigos jerárquicos y descriptivos
const nomenclatura = {
  proyecto: 'PROJ_NombreCorto', // PROJ_RAT
  episodio: 'EP_NNN', // EP_001
  secuencia: 'SEQ_Descriptor', // SEQ_FOREST
  shot: 'SH_NNN', // SH_001
  version: 'CODIGO_vNNN', // SH001_v001
  asset: 'TIPO_Nombre', // CHAR_HERO
  playlist: 'PL_Proposito', // PL_CLIENT_REVIEW
  status: 'ESTADO_DESCRIPTIVO', // ANIMATION, LIGHTING
};

// Ejemplo de jerarquía completa
const ejemploCompleto = {
  proyecto: 'PROJ_RAT',
  episodio: 'EP_001',
  secuencia: 'SEQ_FOREST',
  shot: 'SH_001',
  version: 'SH001_v001',
};
```

### Orden de Creación

**Recomendado:**

```javascript
// Seguir el orden jerárquico
async function configurarProduccion() {
  // 1. Crear proyecto
  const proyecto = await crearProyecto({
    code: 'PROJ_SERIE',
    name: 'Mi Serie',
    status: 'active',
  });

  // 2. Crear episodio
  const episodio = await crearEpisodio({
    code: 'EP_001',
    name: 'Episodio 1',
    projectId: proyecto.id,
  });

  // 3. Crear secuencia
  const secuencia = await crearSecuencia({
    code: 'SEQ_001',
    name: 'Secuencia 1',
    episodeId: episodio.id,
  });

  // 4. Crear shots
  const shots = await Promise.all([
    crearShot({ code: 'SH_001', sequenceId: secuencia.id }),
    crearShot({ code: 'SH_002', sequenceId: secuencia.id }),
    crearShot({ code: 'SH_003', sequenceId: secuencia.id }),
  ]);

  return { proyecto, episodio, secuencia, shots };
}
```

## Subida de Archivos

### Validación de Archivos

**Recomendado:**

```javascript
async function subirVideo(versionCode, file) {
  // Validar tipo
  const tiposPermitidos = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  if (!tiposPermitidos.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido. Usa MP4, MOV o AVI.');
  }

  // Validar tamaño (ej: máximo 500MB)
  const maxSize = 500 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('El archivo es demasiado grande. Máximo 500MB.');
  }

  // Subir con progreso
  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const porcentaje = (e.loaded / e.total) * 100;
        actualizarProgreso(porcentaje);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Error ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Error de red')));

    xhr.open('POST', `/versions/${versionCode}/file`);
    xhr.setRequestHeader('Authorization', `Bearer ${getAccessToken()}`);
    xhr.send(formData);
  });
}
```

### Compresión de Imágenes (Thumbnails)

**Recomendado:**

```javascript
async function comprimirImagen(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality,
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Uso
async function subirThumbnail(versionCode, file) {
  const imagenComprimida = await comprimirImagen(file);

  const formData = new FormData();
  formData.append('file', imagenComprimida);

  return await apiRequest(`/versions/${versionCode}/thumbnail`, {
    method: 'POST',
    body: formData,
  });
}
```

## Búsqueda y Filtrado

### Construcción de Queries

**Recomendado:**

```javascript
class QueryBuilder {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.params = new URLSearchParams();
  }

  where(key, value) {
    if (value !== null && value !== undefined && value !== '') {
      this.params.append(key, value);
    }
    return this;
  }

  build() {
    const query = this.params.toString();
    return query ? `${this.endpoint}?${query}` : this.endpoint;
  }
}

// Uso
const query = new QueryBuilder('/shots')
  .where('status', filtros.status)
  .where('shotType', filtros.shotType)
  .where('sequenceId', filtros.sequenceId)
  .build();

const shots = await apiRequest(query);
```

### Paginación (cuando esté implementada)

**Recomendado:**

```javascript
async function cargarShotsPaginados(page = 1, limit = 20) {
  const response = await apiRequest(`/shots?page=${page}&limit=${limit}&status=waiting`);

  return {
    datos: response.data,
    total: response.total,
    pagina: response.page,
    totalPaginas: Math.ceil(response.total / limit),
  };
}
```

## Colaboración y Notas

### Sistema de Notas Efectivo

**Recomendado:**

```javascript
// Crear notas descriptivas y accionables
async function crearNotaRevision(shotId, cambiosSolicitados) {
  return await apiRequest('/notes', {
    method: 'POST',
    body: JSON.stringify({
      subject: `Revisión Shot ${shotCode}`,
      content: `
        **Cambios solicitados:**
        ${cambiosSolicitados.map((c, i) => `${i + 1}. ${c}`).join('\n')}

        **Prioridad:** ${prioridad}
        **Deadline:** ${deadline}
      `,
      noteType: 'revision',
      linkId: shotId,
      linkType: 'Shot',
      isRead: false,
      createdBy: userEmail,
      assignedTo: animatorEmail,
    }),
  });
}
```

### Flujo de Aprobación

**Recomendado:**

```javascript
async function flujoAprobacion(versionId, aprobada, comentarios) {
  // 1. Crear nota de aprobación/revisión
  await apiRequest('/notes', {
    method: 'POST',
    body: JSON.stringify({
      subject: aprobada ? 'Versión Aprobada' : 'Cambios Requeridos',
      content: comentarios,
      noteType: aprobada ? 'approval' : 'revision',
      linkId: versionId,
      linkType: 'Version',
      createdBy: supervisorEmail,
      assignedTo: aprobada ? null : artistaEmail,
    }),
  });

  // 2. Actualizar estado de la versión
  await apiRequest(`/versions/${versionCode}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: aprobada ? 'approved' : 'rejected',
    }),
  });

  // 3. Si está aprobada, marcar como latest
  if (aprobada) {
    await apiRequest(`/versions/${versionCode}`, {
      method: 'PATCH',
      body: JSON.stringify({
        latest: true,
        publishedAt: new Date().toISOString(),
      }),
    });
  }
}
```

## Performance

### Batch Operations

**Recomendado:**

```javascript
// Crear múltiples recursos en paralelo cuando sea posible
async function crearMultiplesShots(shotsData) {
  const promesas = shotsData.map((data) =>
    apiRequest('/shots', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );

  // Esperar a que todos completen
  const resultados = await Promise.allSettled(promesas);

  // Separar éxitos y errores
  const exitos = resultados.filter((r) => r.status === 'fulfilled').map((r) => r.value);

  const errores = resultados.filter((r) => r.status === 'rejected').map((r) => r.reason);

  return { exitos, errores };
}
```

**No Recomendado:**

```javascript
// ❌ Crear recursos uno por uno secuencialmente
async function crearMultiplesShots(shotsData) {
  const shots = [];
  for (const data of shotsData) {
    const shot = await apiRequest('/shots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    shots.push(shot);
  }
  return shots;
}
```

### Lazy Loading

**Recomendado:**

```javascript
// Cargar versiones solo cuando se necesitan
async function cargarShotConVersiones(shotId, incluirVersiones = false) {
  const shot = await apiRequest(`/shots/${shotId}`);

  if (incluirVersiones) {
    shot.versiones = await apiRequest(`/versions?shotId=${shotId}`);
  }

  return shot;
}
```

## Testing

### Tests de Integración

**Recomendado:**

```javascript
describe('API de Proyectos', () => {
  let accessToken;
  let projectId;

  beforeAll(async () => {
    // Autenticarse
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPass123!',
      }),
    });
    const data = await response.json();
    accessToken = data.tokens.accessToken;
  });

  test('Crear proyecto', async () => {
    const response = await fetch('/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        code: 'TEST_PROJ',
        name: 'Proyecto de Prueba',
        status: 'active',
      }),
    });

    expect(response.status).toBe(201);
    const project = await response.json();
    projectId = project.id;
    expect(project.code).toBe('TEST_PROJ');
  });

  test('Obtener proyecto', async () => {
    const response = await fetch(`/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(200);
    const project = await response.json();
    expect(project.id).toBe(projectId);
  });

  afterAll(async () => {
    // Limpiar: eliminar proyecto de prueba
    await fetch(`/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  });
});
```

---

Estas mejores prácticas te ayudarán a usar la API de manera eficiente, segura y mantenible. Consulta la documentación completa para más detalles sobre cada endpoint.
