# Migración: De Codes a IDs Tradicionales

## Instrucciones para Agentes de IA

---

## 🎯 MISIÓN

Migrar el sistema Shogun de usar `code` como primary key a usar **IDs de auto-increment (integer) como primary key**, manteniendo los `code` como campos **unique** para búsqueda y filtrado.

**Estado:** ✅ **BACKEND COMPLETADO** - Frontend pendiente

### Principios No Negociables

✅ Cada entidad tiene un `id` integer auto-increment como @PrimaryGeneratedColumn()
✅ `code` PERMANECE como @Column({ unique: true })
✅ Los tests SIEMPRE se actualizan junto con el código
✅ No hace falta migraciones porque aún no está en producción la app
✅ Mantener backward compatibility en búsquedas

---

## 📊 ANÁLISIS DEL PROYECTO

### Entidades Afectadas

| Entidad      | Estado Actual                     | Estado Migración | Dependencias        |
| ------------ | --------------------------------- | ---------------- | ------------------- |
| **Project**  | UUID PK + unique code             | ✅ Completado    | -                   |
| **Episode**  | code como PK                      | ✅ Completado    | Project             |
| **Sequence** | code como PK                      | ✅ Completado    | Episode             |
| **Shot**     | code como PK                      | ✅ Completado    | Sequence            |
| **Asset**    | code como PK                      | ✅ Completado    | Project             |
| **Playlist** | code como PK                      | ✅ Completado    | Project             |
| **Version**  | code como PK, entityCode→entityId | ✅ Completado    | TODAS (polimórfica) |

**Todas las entidades ahora tienen:** `id (PK integer) + code (UNIQUE string)`

### Orden Recomendado de Migración

1. **Project** (no tiene dependencias, es base)
2. **Episode** (depende de Project)
3. **Asset** (depende de Project)
4. **Sequence** (depende de Episode)
5. **Shot** (depende de Sequence)
6. **Playlist** (depende de Project)
7. **Version** (depende de TODAS - ÚLTIMO, muy compleja)

### Archivos Clave por Entidad

Para `{Entity}` (ejemplo: Episode):

```
/apps/api/src/
  entities/
    └─ {entity}.entity.ts          ← Cambiar PK y relaciones
  {entities}/
    ├─ {entity}.service.ts         ← Añadir findOneById()
    ├─ {entity}.controller.ts       ← Cambiar rutas a :id
    ├─ {entity}.service.spec.ts    ← Actualizar tests
    └─ dto/
        ├─ create-{entity}.dto.ts  ← Sin id
        └─ update-{entity}.dto.ts  ← Sin id

/apps/api/test/e2e/
  └─ {entity}.e2e-spec.ts          ← Actualizar URLs

/packages/shared/src/
  └─ index.ts                       ← Añadir id: string
```

---

## 🔧 PROCESO PASO A PASO

### PASO 1: Entity File

**Ubicación:** `/apps/api/src/entities/{entity}.entity.ts`

**Cambio principal:**

```typescript
// ANTES:
@PrimaryColumn()
code: string;

// DESPUÉS:
@PrimaryGeneratedColumn()
id: number;

@Column({ unique: true })
code: string;
```

**Validar:**

- [ ] Integer auto-increment como @PrimaryGeneratedColumn()
- [ ] code como @Column({ unique: true })
- [ ] Relaciones @JoinColumn usan `xxxId`, no `xxxCode`
- [ ] FK son number (integer), no string
- [ ] Sin referencias a code como FK

---

### PASO 2: Service (Lógica de Negocio)

**Ubicación:** `/apps/api/src/{entity}/{entity}.service.ts`

**Métodos requeridos:**

```typescript
// Mantener para compatibilidad:
async findOne(code: string): Promise<Entity> {
  return this.entityRepository.findOne({ where: { code } });
}

// NUEVO - primario:
async findOneById(id: number): Promise<Entity> {
  if (!id) throw new BadRequestException('ID required');
  const entity = await this.entityRepository.findOne({ where: { id } });
  if (!entity) throw new NotFoundException();
  return entity;
}

// Actualizar create():
async create(createDto: CreateEntityDto): Promise<Entity> {
  const existing = await this.entityRepository.findOne({
    where: { code: createDto.code }
  });
  if (existing) {
    throw new ConflictException(`Code ${createDto.code} already exists`);
  }

  const entity = this.entityRepository.create({
    code: createDto.code,
    // ...otros campos...
  });
  return this.entityRepository.save(entity);
}

// Actualizar update():
async update(id: number, updateDto: UpdateEntityDto): Promise<Entity> {
  const entity = await this.findOneById(id);

  if (updateDto.code && updateDto.code !== entity.code) {
    const existing = await this.entityRepository.findOne({
      where: { code: updateDto.code }
    });
    if (existing) {
      throw new ConflictException(`Code ${updateDto.code} already exists`);
    }
  }

  Object.assign(entity, updateDto);
  return this.entityRepository.save(entity);
}

// Actualizar delete():
async delete(id: number): Promise<void> {
  await this.findOneById(id);
  await this.entityRepository.delete(id);
}
```

**Validar:**

- [ ] findOne(code) mantiene funcionalidad
- [ ] findOneById(id) nuevo
- [ ] create() genera id automáticamente
- [ ] update() usa id como parámetro
- [ ] delete() usa id como parámetro
- [ ] Validación de code unique se mantiene

---

### PASO 3: Controller (Rutas API)

**Ubicación:** `/apps/api/src/{entity}/{entity}.controller.ts`

**Cambios de rutas:**

```typescript
// PRIMARIAS - Usar :id:
@Get(':id')
async getOne(@Param('id', ParseIntPipe) id: number) {
  return this.entityService.findOneById(id);
}

@Patch(':id')
async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateEntityDto) {
  return this.entityService.update(id, updateDto);
}

@Delete(':id')
async delete(@Param('id', ParseIntPipe) id: number) {
  return this.entityService.delete(id);
}

// COMPATIBILIDAD - Búsqueda por code (opcional pero recomendado):
@Get('byCode/:code')
async getByCode(@Param('code') code: string) {
  return this.entityService.findOne(code);
}

// BÚSQUEDA - Query params:
@Get()
async getAll(@Query('code') code?: string, @Query('name') name?: string) {
  const where = {};
  if (code) where['code'] = code;
  if (name) where['name'] = ILike(`%${name}%`);
  return this.entityRepository.find({ where });
}
```

**Validar:**

- [ ] Rutas principales usan `:id`
- [ ] Respuestas incluyen tanto `id` como `code`
- [ ] Búsqueda por code disponible como query param

---

### PASO 4: DTOs

**Ubicación:** `/apps/api/src/{entity}/dto/*.ts`

**Regla:** El ID nunca va en CreateDto ni UpdateDto porque:

- CreateDto: El ID se genera automáticamente (no se pasa)
- UpdateDto: El ID va en la URL como @Param, no en el body (la PK no es modificable)

```typescript
// CreateEntityDto - SIN id:
export class CreateEntityDto {
  @IsNotEmpty()
  code: string;
  // ...otros campos sin id

  // NO incluir id - se genera automáticamente
}

// UpdateEntityDto - SIN id:
export class UpdateEntityDto {
  @IsOptional()
  code?: string;
  // ...otros campos opcionales

  // NO incluir id - viene en la URL como @Param('id')
}

// ResponseDto - CON id:
export class EntityResponseDto {
  id: number; // Incluir! (se retorna en la respuesta)
  code: string;
  // ...otros campos
}
```

**Ejemplo de uso en Controller:**

```typescript
// El ID viene en la URL, no en el body:
@Patch(':id')
async update(
  @Param('id', ParseIntPipe) id: number,  // ID aquí
  @Body() updateDto: UpdateEntityDto      // Campos modificables aquí
) {
  return this.service.update(id, updateDto);
}

// Request:
// PATCH /episodes/123
// Body: { "name": "Updated" }
// NO incluir id en el body
```

**Validar:**

- [ ] CreateDto sin `id`
- [ ] UpdateDto sin `id`
- [ ] ResponseDto incluye `id` y `code`

---

### PASO 5: Tipos Compartidos

**Ubicación:** `/packages/shared/src/index.ts`

```typescript
// ANTES:
export interface Episode {
  code: string;
  // ...
}

// DESPUÉS:
export interface Episode {
  id: number; // NUEVO
  code: string;
  // ...
}
```

**Validar:**

- [ ] Interfaz incluye `id: number`

---

### PASO 6: Relaciones (CRÍTICO)

Si hay relaciones con otras entidades:

```typescript
// ANTES:
@ManyToOne(() => Project)
@JoinColumn({ name: 'projectCode' })
project: Project;

// DESPUÉS:
@Column()
projectId: number;

@ManyToOne(() => Project)
@JoinColumn({ name: 'projectId' })
project: Project;
```

**Validar:**

- [ ] @JoinColumn usa `{name: 'entityId'}`, no `entityCode`
- [ ] Column tipo number (integer), no string
- [ ] Migraciones de BD actualizadas

---

### PASO 7: Tests Unitarios

**Ubicación:** `/apps/api/src/{entity}/{entity}.service.spec.ts`

```typescript
describe('findOne', () => {
  it('should find by code', async () => {
    const result = await service.findOne('CODE123');
    expect(result.code).toBe('CODE123');
    expect(result.id).toBeDefined(); // Nuevo
  });
});

describe('findOneById', () => {
  it('should find by id', async () => {
    const entity = await createTestEntity();
    const result = await service.findOneById(entity.id);
    expect(result.id).toBe(entity.id);
  });

  it('should throw if not found', async () => {
    await expect(service.findOneById(999)).rejects.toThrow();
  });
});

describe('create', () => {
  it('should auto-generate id', async () => {
    const result = await service.create({ code: 'TEST', name: 'Test' });
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
  });

  it('should throw if code exists', async () => {
    const dto = { code: 'DUP', name: 'Test' };
    await service.create(dto);
    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });
});

describe('update', () => {
  it('should update and preserve id', async () => {
    const entity = await createTestEntity();
    const result = await service.update(entity.id, { name: 'Updated' });
    expect(result.id).toBe(entity.id); // id no cambia
  });
});

describe('delete', () => {
  it('should delete by id', async () => {
    const entity = await createTestEntity();
    await service.delete(entity.id);
    await expect(service.findOneById(entity.id)).rejects.toThrow();
  });
});
```

**Validar:**

- [ ] Tests de findOne(code) mantienen funcionalidad
- [ ] Tests de findOneById(id) nuevo
- [ ] Tests de auto-generación de integer ID
- [ ] Tests de validación de uniqueness
- [ ] 100% de tests PASS

---

### PASO 8: Tests E2E

**Ubicación:** `/apps/api/test/e2e/{entity}.e2e-spec.ts`

```typescript
describe('GET /entities/:id', () => {
  it('should get entity by id', async () => {
    const entity = await createTestEntity();
    const response = await request(app.getHttpServer()).get(`/entities/${entity.id}`).expect(200);
    expect(response.body.data.id).toBe(entity.id);
    expect(response.body.data.code).toBeDefined();
  });
});

describe('POST /entities', () => {
  it('should create with auto-generated id', async () => {
    const response = await request(app.getHttpServer())
      .post('/entities')
      .send({ code: 'NEW001', name: 'Test' })
      .expect(201);
    expect(typeof response.body.data.id).toBe('number');
    expect(response.body.data.code).toBe('NEW001');
  });
});

describe('PATCH /entities/:id', () => {
  it('should update by id', async () => {
    const entity = await createTestEntity();
    const response = await request(app.getHttpServer())
      .patch(`/entities/${entity.id}`)
      .send({ name: 'Updated' })
      .expect(200);
    expect(response.body.data.id).toBe(entity.id);
  });
});

describe('DELETE /entities/:id', () => {
  it('should delete by id', async () => {
    const entity = await createTestEntity();
    await request(app.getHttpServer()).delete(`/entities/${entity.id}`).expect(200);
  });
});
```

**Validar:**

- [ ] URLs usan `:id` no `:code`
- [ ] Respuestas incluyen `id`
- [ ] 100% de tests PASS

---

### PASO 9: Verificación Final

```bash
# Build
npm run build  # SIN ERRORES

# Types
npm run check-types  # SIN ERRORES

# Tests
npm run test -- {entity}.service.spec.ts  # 100% PASS
npm run test:e2e -- {entity}.e2e-spec.ts  # 100% PASS

# Git
git diff  # Revisar cambios coherentes
```

---

### PASO 9: Documentación API (Swagger)

**Ubicación:** `/apps/api/src/{entity}/{entity}.controller.ts`

Actualizar decoradores @ApiParam, @ApiResponse:

```typescript
@Get(':id')
@ApiParam({
  name: 'id',
  type: 'number',
  description: 'Entity integer ID (auto-increment)',
  example: 123
})
@ApiResponse({
  status: 200,
  description: 'Entity found',
  schema: {
    properties: {
      id: { type: 'number', example: 123 },
      code: { type: 'string', example: 'EP001' },
      // ...otros campos
    }
  }
})
async getOne(@Param('id', ParseIntPipe) id: number) {
  return this.entityService.findOneById(id);
}

@Post()
@ApiBody({ type: CreateEntityDto })
@ApiResponse({
  status: 201,
  description: 'Entity created with auto-generated ID',
  schema: {
    properties: {
      id: { type: 'number' },
      code: { type: 'string' }
    }
  }
})
async create(@Body() createDto: CreateEntityDto) {
  return this.entityService.create(createDto);
}
```

**Validar:**

- [ ] @ApiParam describe integer ID
- [ ] @ApiResponse muestra id y code
- [ ] Swagger doc accesible en /api/docs

---

### PASO 10: Frontend - Actualizar Queries React

**Ubicación:** `/apps/web/src/**/*.ts(x)`

#### Hooks de Data Fetching

```typescript
// ANTES:
export const useEpisode = (code: string) => {
  return useQuery({
    queryKey: ['episode', code],
    queryFn: async () => {
      const res = await fetch(`/api/episodes/byCode/${code}`);
      return res.json();
    },
  });
};

// DESPUÉS:
export const useEpisode = (id: number) => {
  return useQuery({
    queryKey: ['episode', id],
    queryFn: async () => {
      const res = await fetch(`/api/episodes/${id}`);
      if (!res.ok) throw new Error('Episode not found');
      return res.json();
    },
    enabled: !!id, // Solo fetch si id existe
  });
};
```

#### Actualizar Rutas React

```typescript
// ANTES:
<Route path="/episodes/:code" element={<EpisodeDetail />} />

// DESPUÉS:
<Route path="/episodes/:id" element={<EpisodeDetail />} />
```

#### Actualizar useParams

```typescript
// ANTES:
const { code } = useParams<{ code: string }>();
const { data: episode } = useEpisode(code);

// DESPUÉS:
const { id } = useParams<{ id: string }>();
const episodeId = parseInt(id, 10);
if (isNaN(episodeId)) throw new Error('Invalid ID');
const { data: episode } = useEpisode(episodeId);
```

#### Actualizar Links/Navigation

```typescript
// ANTES:
<Link to={`/episodes/${episode.code}`}>

// DESPUÉS:
<Link to={`/episodes/${episode.id}`}>
```

#### Actualizar Mutations (Create/Update/Delete)

```typescript
// ANTES - DELETE:
const deleteEpisode = async (code: string) => {
  await fetch(`/api/episodes/${code}`, { method: 'DELETE' });
};

// DESPUÉS - DELETE:
const deleteEpisode = async (id: number) => {
  const res = await fetch(`/api/episodes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete');
};

// ANTES - UPDATE:
const updateEpisode = async (code: string, data: Partial<Episode>) => {
  const res = await fetch(`/api/episodes/${code}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.json();
};

// DESPUÉS - UPDATE:
const updateEpisode = async (id: number, data: Partial<Episode>) => {
  const res = await fetch(`/api/episodes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
};
```

#### Actualizar Zustand/State Management

```typescript
// ANTES:
create((set) => ({
  currentEpisodeCode: null,
  setCurrentEpisodeCode: (code: string) => set({ currentEpisodeCode: code }),
}));

// DESPUÉS:
create((set) => ({
  currentEpisodeId: null,
  setCurrentEpisodeId: (id: number) => set({ currentEpisodeId: id }),
}));
```

#### Actualizar useQuery Infinitas

```typescript
// DESPUÉS - Si usas infinite queries (react-window + infinite loader):
const useEpisodesInfinite = () => {
  return useInfiniteQuery({
    queryKey: ['episodes'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/episodes?skip=${pageParam}&take=20`);
      return res.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.data.length === 20 ? allPages.length * 20 : undefined;
    },
  });
};
```

**Validar:**

- [ ] Todos los fetch usan integer IDs
- [ ] useParams parsea a number
- [ ] Links usan episode.id no episode.code
- [ ] Mutations actualizadas
- [ ] Zustand stores actualizados
- [ ] Tipos en TypeScript actualizados

---

### PASO 11: Frontend Tests E2E (Playwright)

**Ubicación:** `/apps/web/e2e/**/*.spec.ts`

```typescript
// ANTES:
test('navigate to episode', async ({ page }) => {
  await page.goto('/episodes/EP001');
  await expect(page.locator('h1')).toContainText('EP001');
});

// DESPUÉS:
test('navigate to episode by id', async ({ page }) => {
  // Primero crear un episode, obtener su id
  const response = await page.request.post('/api/episodes', {
    data: { code: 'EP001', name: 'Test Episode' },
  });
  const episode = await response.json();
  const episodeId = episode.data.id;

  await page.goto(`/episodes/${episodeId}`);
  await expect(page.locator('h1')).toContainText('Test Episode');
});

// ANTES:
test('edit episode', async ({ page }) => {
  await page.goto('/episodes/EP001');
  await page.fill('[data-testid="name-input"]', 'Updated');
  await page.click('button:has-text("Save")');
  await expect(page.locator('.toast')).toContainText('Saved');
});

// DESPUÉS:
test('edit episode', async ({ page }) => {
  const response = await page.request.post('/api/episodes', {
    data: { code: 'EP001', name: 'Original' },
  });
  const episode = await response.json();

  await page.goto(`/episodes/${episode.data.id}`);
  await page.fill('[data-testid="name-input"]', 'Updated');
  await page.click('button:has-text("Save")');
  await expect(page.locator('.toast')).toContainText('Saved');
});

// ANTES:
test('delete episode', async ({ page }) => {
  await page.goto('/episodes/EP001');
  await page.click('button:has-text("Delete")');
  await expect(page).toHaveURL('/episodes');
});

// DESPUÉS:
test('delete episode', async ({ page }) => {
  const response = await page.request.post('/api/episodes', {
    data: { code: 'EP001', name: 'To Delete' },
  });
  const episode = await response.json();

  await page.goto(`/episodes/${episode.data.id}`);
  await page.click('button:has-text("Delete")');
  await expect(page).toHaveURL('/episodes');
});

// ANTES:
test('list episodes by search code', async ({ page }) => {
  await page.goto('/episodes?code=EP001');
  await expect(page.locator('text=EP001')).toBeVisible();
});

// DESPUÉS:
test('list episodes', async ({ page }) => {
  // Crear un episode test
  await page.request.post('/api/episodes', {
    data: { code: 'TESTEP', name: 'Test' },
  });

  await page.goto('/episodes');
  await expect(page.locator('text=Test')).toBeVisible();
});
```

**Patrón General:**

```typescript
// Para cualquier test que necesite una entidad:
1. Usar API para crear: const res = await page.request.post(...)
2. Extraer id: const id = (await res.json()).data.id
3. Navegar usando id: await page.goto(`/path/${id}`)
4. Verificar cambios usando datos del API
```

**Validar:**

- [ ] Tests usan integers IDs (no codes)
- [ ] Todos los tests navegan a `/path/:id`
- [ ] Tests crean entities vía API y usan su ID
- [ ] 100% de tests E2E PASS
- [ ] No hay hardcoded codes en URLs

---

## ⚠️ CASOS ESPECIALES

### Version Entity (Polimórfica - MÁS COMPLEJA)

**Importante:** Version es una entidad especial que puede referenciar a CUALQUIER otra entidad.

**No tiene Foreign Keys tradicionales**, usa:

- `entityId: number` → ID de la entidad padre (Shot, Asset, Sequence, Playlist, Episode)
- `entityType: string` → Tipo de entidad ('shot' | 'asset' | 'sequence' | 'playlist' | 'episode')

**Cambio crítico:**

```typescript
// ANTES:
@Column()
entityCode: string;  // Referenciaba code de cualquier entidad

// DESPUÉS:
@Column()
entityId: number;    // Referencia a UUID/ID (integer) de cualquier entidad

@Column()
entityType: string;  // Tipo de entidad para saber dónde buscar
```

**Actualizar todas las queries polimórficas:**

```typescript
// ANTES - Buscar versiones de un Shot por code:
const versions = await versionRepository.find({
  where: { entityCode: shot.code, entityType: 'shot' },
});

// DESPUÉS - Buscar versiones de un Shot por id:
const versions = await versionRepository.find({
  where: { entityId: shot.id, entityType: 'shot' },
});

// ANTES - Buscar versiones de un Asset:
const versions = await versionRepository.find({
  where: { entityCode: asset.code, entityType: 'asset' },
});

// DESPUÉS - Buscar versiones de un Asset:
const versions = await versionRepository.find({
  where: { entityId: asset.id, entityType: 'asset' },
});
```

**⚠️ NOTA:** Version se migra ÚLTIMO porque todas las otras entidades deben estar listas primero (Shot, Asset, Sequence, Playlist, Episode)

---

## 🚨 ERRORES COMUNES

| Error                | Causa                  | Solución                           |
| -------------------- | ---------------------- | ---------------------------------- |
| "code is not unique" | @Column sin unique     | Agregar `{ unique: true }`         |
| "id is null"         | Olvida auto-generation | `@PrimaryGeneratedColumn()`        |
| FK error             | JoinColumn usa code    | Cambiar a `{ name: 'entityId' }`   |
| Tests fallan         | URLs aún con code      | Cambiar a `:id` en controller      |
| Build error          | DTOs incluyen id       | Remover id de CreateDto            |
| Type error           | Interface sin id       | Agregar `id: number` en shared/src |

---

## ✅ DEFINICIÓN DE HECHO

Una entidad está completamente migrada cuando:

- ✅ Entity: Integer PK auto-increment + unique code
- ✅ Service: findOne(code) + findOneById(id)
- ✅ Controller: Rutas con :id
- ✅ DTOs: Sin id en Create/Update
- ✅ Types: Incluyen `id: number` en shared/src
- ✅ Relations: Usan id (number), no code
- ✅ Tests: 100% PASS (unit + e2e)
- ✅ Build: Sin errores
- ✅ TypeScript: Sin errores de tipos

---

## 📝 Patrón de Commit

```
feat: migrate {Entity} from code PK to integer ID + unique code

- Add id: integer @PrimaryGeneratedColumn() to {Entity}
- Move code to @Column({ unique: true })
- Update {entity}.service with findOneById() method
- Update {entity}.controller routes to use :id parameter
- Update all unit and E2E tests

BREAKING CHANGE: API endpoints now use integer ID, not code
  GET /entities/:code → GET /entities/:id
  (GET /entities/byCode/:code available for compatibility)
```

---

## 🔄 Relaciones de Dependencia

```
Migrar en este orden (respetando dependencias):
1. Project   (no depende de nadie - es la base)
2. Episode   (depende: Project)
3. Asset     (depende: Project)
4. Sequence  (depende: Episode)
5. Shot      (depende: Sequence)
6. Playlist  (depende: Project)
7. Version   (depende: TODAS - hacer ÚLTIMO, muy compleja)
```

---

## 📞 COMPORTAMIENTO ESPERADO DEL AGENTE

**DO ✅**

- Lee la entidad completa antes de cambiar
- Un cambio a la vez, verificable
- Tests simultáneamente con código
- Commits pequeños y descriptivos
- Valida cambios (npm run test)
- Mantén code como unique constraint
- Revisa qué más se puede romper

**DON'T ❌**

- No cambies múltiples entidades en un commit
- No olvides los tests
- No elimines code field
- No cambies BD sin migración
- No mezcles cambios sin relación
- No ignores errores en tests
- No hagas cambios "a la vez"

---

## 🎓 Estructura Estándar de Cambios

Para cada entidad:

```
1. Leer entidad actual
2. Cambiar entity.ts (PK + relaciones)
3. Cambiar service.ts (métodos)
4. Cambiar controller.ts (rutas)
5. Cambiar DTOs (sin id)
6. Cambiar shared/src (tipos)
7. Actualizar tests unitarios
8. Actualizar tests E2E
9. Crear/actualizar migración BD
10. Verificar: build, types, tests
11. Commit y describe cambios
```

---

### PASO 12: Actualizar Tipos Compartidos

**Ubicación:** `/packages/shared/src/index.ts`

Para cada entidad migrada, agregar `id: number` a la interfaz:

```typescript
// ANTES:
export interface Episode {
  code: string;
  name: string;
  projectCode: string;
  // ...
}

// DESPUÉS:
export interface Episode {
  id: number; // NUEVO - integer ID
  code: string; // PERMANECE - unique identifier
  name: string;
  projectId: number; // Si tiene FK - cambiar de projectCode a projectId
  // ...
}

// Actualizar el patrón en TODAS las interfaces
export interface Shot {
  id: number;
  code: string;
  sequenceId: number; // No sequenceCode
  // ...
}

export interface Asset {
  id: number;
  code: string;
  projectId: number; // No projectCode
  // ...
}

// IMPORTANTE - Version entity (polimórfica):
export interface Version {
  id: number;
  code: string;
  entityId: number; // No entityCode - referencia a cualquier entidad
  entityType: 'shot' | 'asset' | 'sequence' | 'playlist' | 'episode';
  // ...
}
```

**Validar:**

- [ ] Todas las entidades tienen `id: number`
- [ ] Todos los FK cambiados de `{entity}Code` a `{entity}Id`
- [ ] Version tiene `entityId` y `entityType`
- [ ] Build sin errores: `npm run build --filter=@shogun/shared`
- [ ] Frontend tipos actualizados automáticamente

---

### PASO 13: Lint & Type Validation

**Backend:**

```bash
# En /apps/api:
npm run lint:errors-only    # SIN errores
npm run check-types         # SIN errores de tipos
npm run build              # SIN errores de build
npm run test               # 100% PASS
npm run test:e2e           # 100% PASS
```

**Frontend:**

```bash
# En /apps/web:
npm run lint:errors        # SIN errores
npm run check-types        # SIN errores de tipos
npm run build              # SIN errores de build
npm run test:e2e           # 100% PASS
```

**Monorepo:**

```bash
# En root:
npm run check-types        # SIN errores en todo el workspace
npm run build              # SIN errores en todo el workspace
npm run lint               # SIN errores en todo el workspace
```

---

## 📋 Checklist por Entidad

Para cada entidad, verificar:

### Backend ✅

- [ ] Entity: Integer PK auto-increment
- [ ] Entity: `code` como unique column
- [ ] Entity: Relaciones usan `{entity}Id` (number)
- [ ] Service: Método `findOneById(id: number)`
- [ ] Service: Método `findOne(code: string)` mantiene funcionalidad
- [ ] Service: `create()` NO recibe id
- [ ] Service: `update(id, dto)` valida id
- [ ] Service: `delete(id)` valida id
- [ ] Controller: Rutas usan `:id`
- [ ] Controller: Error handling con status codes (404, 409, 400)
- [ ] DTOs: CreateDto sin id
- [ ] DTOs: UpdateDto sin id
- [ ] DTOs: ResponseDto con id y code
- [ ] Swagger: @ApiParam describe integer id
- [ ] Swagger: @ApiResponse muestra id y code
- [ ] Tests unitarios: 100% PASS
- [ ] Tests E2E: 100% PASS
- [ ] Lint: Sin errores
- [ ] Build: Sin errores
- [ ] Types: Sin errores

### Frontend ✅

- [ ] Rutas React: `/path/:id` (no `:code`)
- [ ] useParams: Parsea a number
- [ ] useQuery: Usa integer id
- [ ] Links: Navegan a `.../entity.id`
- [ ] Mutations: DELETE, PATCH usan id
- [ ] Zustand: State stores usan id, no code
- [ ] Hooks custom: Aceptan number, retornan id
- [ ] E2E tests: URLs usan id
- [ ] E2E tests: Crean entities vía API
- [ ] Lint: Sin errores
- [ ] Build: Sin errores
- [ ] Types: Sin errores

### Shared ✅

- [ ] Interface: Agregar `id: number`
- [ ] Interface: FK cambiar a `{entity}Id`
- [ ] Build: `npm run build --filter=@shogun/shared`
- [ ] Types: Sin errores

---

## 📊 Progreso

**Estado:** ✅ **MIGRACIÓN COMPLETADA** - Todas las entidades migradas (Backend)

- [x] **Project** (base - sin dependencias) - ✅ Backend + Tests completados
- [x] **Episode** (depende: Project) - ✅ Backend + Tests completados
- [x] **Asset** (depende: Project) - ✅ Backend + Tests completados
- [x] **Sequence** (depende: Episode) - ✅ Backend + Tests completados
- [x] **Shot** (depende: Sequence) - ✅ Backend + Tests completados
- [x] **Playlist** (depende: Project) - ✅ Backend + Tests completados
- [x] **Version** (depende: TODAS - polimórfica) - ✅ Backend + Tests completados

**Resumen:**

- ✅ 7/7 entidades migradas
- ✅ 910 tests unitarios pasando
- ✅ Tests E2E actualizados y pasando
- ✅ Cobertura: 75.34% statements, 65.89% branches, 75.64% functions, 76.29% lines
- ⏳ Frontend: Pendiente de migración

---

## 🎬 Cómo Ejecutar Este Plan

**Flujo recomendado por entidad:**

```
1. Leer esta guía completamente (no inicies sin entenderla)
2. Cambiar BACKEND (entidad → service → controller → DTOs → swagger)
3. Cambiar tipos en SHARED (interfaces)
4. Tests BACKEND: Unit + E2E (100% PASS)
5. Build backend: npm run build --filter=shogun-api
6. Lint backend: npm run lint --filter=shogun-api
7. Cambiar FRONTEND (hooks → rutas → queries → links → state)
8. Tests FRONTEND: E2E (100% PASS)
9. Build frontend: npm run build --filter=shogun-web
10. Lint frontend: npm run lint --filter=shogun-web
11. Commit: pequeño y descriptivo
12. Verificar monorepo: npm run check-types && npm run lint && npm run build
```

---

**Documentación:** Este archivo es la guía completa  
**Última actualización:** 2025-11-26  
**Estado:** ✅ **MIGRACIÓN BACKEND COMPLETADA**  
**Objetivo:** Migración limpia, testeable y verificable del sistema de codes a IDs

---

## ✅ Estado Final de la Migración

### Backend - Completado ✅

- ✅ **7/7 entidades migradas** (Project, Episode, Sequence, Asset, Shot, Playlist, Version)
- ✅ **910 tests unitarios pasando** (100% de tests)
- ✅ **Tests E2E actualizados y pasando**
- ✅ **Cobertura de tests:** 75.34% statements, 65.89% branches, 75.64% functions, 76.29% lines
- ✅ **Sin errores de lint o tipos**

### Frontend - Pendiente ⏳

- ⏳ Actualización de hooks y queries React
- ⏳ Actualización de rutas y navegación
- ⏳ Actualización de tests E2E (Playwright)

### Próximos Pasos

1. Migrar frontend siguiendo PASO 10-11 de esta guía
2. Actualizar tests E2E del frontend
3. Verificar integración completa backend-frontend
