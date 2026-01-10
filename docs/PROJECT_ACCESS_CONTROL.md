# Project Access Control - Sistema de Aislamiento por Usuario

## 📋 Resumen

Este documento describe el sistema de control de acceso a nivel de proyecto que implementa el aislamiento de recursos por usuario. Los usuarios solo pueden ver y acceder a los proyectos a los que tienen permisos explícitos, excepto los administradores que tienen acceso completo.

## 🏗️ Arquitectura

### Componentes Principales

1. **`ProjectAccessService`** (`apps/api/src/auth/services/project-access.service.ts`)
   - Servicio centralizado para verificar y filtrar acceso a proyectos
   - Métodos principales:
     - `getAccessibleProjectIds(userContext)`: Obtiene todos los IDs de proyectos accesibles
     - `verifyProjectAccess(projectId, userContext, minRole)`: Verifica acceso y lanza excepción si no tiene
     - `hasProjectPermission(projectId, userContext, minRole)`: Verifica acceso sin lanzar excepción
     - Métodos helper para navegar la jerarquía: `getProjectIdFromEpisode`, `getProjectIdFromSequence`, etc.

2. **`UserContext`** (Interface)
   ```typescript
   interface UserContext {
     userId: number;
     role: string; // Global role: admin, director, artist, member
   }
   ```

3. **`ProjectPermission`** (Entity)
   - Tabla que relaciona usuarios con proyectos y sus roles
   - Roles de proyecto: `VIEWER`, `CONTRIBUTOR`, `OWNER`
   - Un usuario puede tener diferentes roles en diferentes proyectos

4. **`ProjectPermissionGuard`** (`apps/api/src/auth/guards/project-permission.guard.ts`)
   - Guard que verifica permisos a nivel de proyecto en endpoints específicos
   - Se usa con el decorador `@RequireProjectRole`

## 🔐 Roles y Permisos

### Roles Globales
- **admin**: Acceso completo a todos los proyectos (bypass de permisos)
- **director**: Rol global, pero necesita permisos específicos por proyecto
- **artist**: Rol global, pero necesita permisos específicos por proyecto
- **member**: Rol global, pero necesita permisos específicos por proyecto

### Roles de Proyecto
- **VIEWER**: Solo lectura
- **CONTRIBUTOR**: Puede crear y editar
- **OWNER**: Control total del proyecto

### Jerarquía de Roles de Proyecto
```
OWNER (3) > CONTRIBUTOR (2) > VIEWER (1)
```

## 📝 Patrón de Implementación

### 1. En Controladores

Los controladores extraen el usuario del request y crean el `UserContext`:

```typescript
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserContext } from '../auth/services';

@Controller('projects')
export class ProjectsController {
  @Get()
  async findAll(
    @Query() filters: FilterProjectsDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    
    return this.projectsService.findAll(filters, userContext);
  }
}
```

### 2. En Servicios - Métodos `findAll`

Los servicios deben filtrar resultados por proyectos accesibles:

```typescript
import { ProjectAccessService } from '../auth/services';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private projectAccessService: ProjectAccessService,
  ) {}

  async findAll(filters?: FilterProjectsDto, userContext?: UserContext): Promise<any> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project');

    // Filter by user's accessible projects (unless admin)
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds = await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        // User has no project access, return empty
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      queryBuilder.andWhere('project.id IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    // ... resto de filtros y lógica

    return results;
  }
}
```

### 3. En Servicios - Métodos de Modificación (create, update, delete)

Para operaciones que modifican datos, se debe verificar acceso antes de proceder:

```typescript
async update(id: number, updateDto: UpdateDto, userContext?: UserContext): Promise<Entity> {
  const entity = await this.repository.findOne({ where: { id } });
  if (!entity) {
    throw new NotFoundException();
  }

  // Verify project access
  if (userContext) {
    const projectId = await this.getProjectIdFromEntity(entity);
    await this.projectAccessService.verifyProjectAccess(
      projectId,
      userContext,
      ProjectRole.CONTRIBUTOR, // Requiere al menos CONTRIBUTOR para editar
    );
  }

  // ... resto de la lógica de actualización
}
```

### 4. Para Entidades Hijas (Episodes, Sequences, Shots)

Las entidades que están en la jerarquía (Shot → Sequence → Episode → Project) necesitan hacer joins para filtrar:

```typescript
async findAll(filters?: FilterSequencesDto, userContext?: UserContext): Promise<Sequence[]> {
  const queryBuilder = this.sequenceRepository
    .createQueryBuilder('sequence')
    .leftJoin('sequence.episode', 'episode');

  // Filter by user's accessible projects (unless admin)
  if (userContext && !this.projectAccessService.isAdmin(userContext)) {
    const accessibleProjectIds = await this.projectAccessService.getAccessibleProjectIds(userContext);
    if (accessibleProjectIds.length === 0) {
      return [];
    }
    queryBuilder.andWhere('episode.projectId IN (:...accessibleProjectIds)', {
      accessibleProjectIds,
    });
  }

  // ... resto de filtros

  return queryBuilder.getMany();
}
```

### 5. Para Assets

Los assets tienen `projectId` directo:

```typescript
async findAll(filters?: FilterAssetsDto, userContext?: UserContext): Promise<Asset[]> {
  const queryBuilder = this.assetRepository
    .createQueryBuilder('asset');

  if (userContext && !this.projectAccessService.isAdmin(userContext)) {
    const accessibleProjectIds = await this.projectAccessService.getAccessibleProjectIds(userContext);
    if (accessibleProjectIds.length === 0) {
      return [];
    }
    queryBuilder.andWhere('asset.projectId IN (:...accessibleProjectIds)', {
      accessibleProjectIds,
    });
  }

  return queryBuilder.getMany();
}
```

### 6. Para Notes

Las notas están vinculadas a entidades mediante `linkType` y `linkId`, por lo que requieren un filtrado más complejo:

```typescript
async findAll(filters?: FilterNotesDto, userContext?: UserContext): Promise<Note[]> {
  const notes = await this.noteRepository.find({ /* ... */ });

  if (userContext && !this.projectAccessService.isAdmin(userContext)) {
    const accessibleProjectIds = await this.projectAccessService.getAccessibleProjectIds(userContext);
    if (accessibleProjectIds.length === 0) {
      return [];
    }

    // Filter notes by checking if their linked entity's project is accessible
    const filteredNotes = [];
    for (const note of notes) {
      try {
        const projectId = await this.getProjectIdFromNote(note);
        if (projectId && accessibleProjectIds.includes(projectId)) {
          filteredNotes.push(note);
        }
      } catch (error) {
        // Skip notes where we can't determine project access
        continue;
      }
    }
    return filteredNotes;
  }

  return notes;
}
```

## 🔄 Flujo de Verificación

### Para Lectura (findAll, findOne)
1. Si `userContext` no existe → retornar todos los resultados (o error si requiere autenticación)
2. Si es admin → retornar todos los resultados
3. Si no es admin:
   - Obtener `accessibleProjectIds` usando `getAccessibleProjectIds(userContext)`
   - Si no tiene proyectos accesibles → retornar array vacío
   - Filtrar query con `WHERE projectId IN (:...accessibleProjectIds)`

### Para Escritura (create, update, delete)
1. Obtener el `projectId` de la entidad (directo o navegando la jerarquía)
2. Verificar acceso con `verifyProjectAccess(projectId, userContext, minRole)`
3. Si no tiene acceso → se lanza `ForbiddenException`
4. Si tiene acceso → proceder con la operación

## 📦 Módulos

Cada módulo que necesita control de acceso debe importar `ProjectAccessModule`:

```typescript
import { ProjectAccessModule } from '../auth/services/project-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Entity]),
    ProjectAccessModule, // ← Importar aquí
  ],
  // ...
})
export class EntityModule {}
```

## ✅ Checklist de Implementación

Para agregar control de acceso a un nuevo servicio:

- [ ] Importar `ProjectAccessModule` en el módulo
- [ ] Inyectar `ProjectAccessService` en el constructor del servicio
- [ ] Agregar parámetro `userContext?: UserContext` a métodos públicos
- [ ] En `findAll`: Filtrar por `accessibleProjectIds` si no es admin
- [ ] En `findOne`: Verificar acceso con `verifyProjectAccess` o filtrar en query
- [ ] En `create`: Verificar acceso al proyecto antes de crear
- [ ] En `update`: Verificar acceso con rol mínimo `CONTRIBUTOR`
- [ ] En `delete`: Verificar acceso con rol mínimo `OWNER` o `CONTRIBUTOR` según política
- [ ] En controlador: Extraer `UserContext` de `@CurrentUser()` y pasarlo al servicio
- [ ] Probar con usuario admin (debe ver todo)
- [ ] Probar con usuario sin permisos (debe ver solo sus proyectos)
- [ ] Probar con usuario sin proyectos (debe retornar vacío)

## 🎯 Ejemplos de Uso

### Búsqueda con Filtrado

El servicio de búsqueda implementa filtrado por proyecto en todas las entidades:

```typescript
// search.service.ts
async search(dto: SearchQueryDto, userContext?: UserContext) {
  // Cada método de búsqueda filtra por proyectos accesibles
  return this.searchProjects(query, page, limit, userContext);
}
```

### Verificación en Operaciones Críticas

```typescript
async delete(id: number, userContext?: UserContext): Promise<void> {
  const entity = await this.findOneById(id, userContext);
  
  if (userContext) {
    const projectId = await this.getProjectIdFromEntity(entity);
    await this.projectAccessService.verifyProjectAccess(
      projectId,
      userContext,
      ProjectRole.OWNER, // Solo owners pueden eliminar
    );
  }

  await this.repository.remove(entity);
}
```

## 🚨 Consideraciones Importantes

1. **Admins siempre tienen acceso**: Los usuarios con rol global `admin` bypassan todas las verificaciones de proyecto
2. **Performance**: `getAccessibleProjectIds` hace una query a la BD. Considerar caché si es necesario
3. **Consistencia**: Siempre aplicar el mismo filtro en queries de datos y en queries de conteo
4. **Jerarquía**: Recordar que Shot → Sequence → Episode → Project, necesitas hacer joins apropiados
5. **Notes son especiales**: Están vinculadas dinámicamente, requieren verificación individual

## 📚 Referencias

- `apps/api/src/auth/services/project-access.service.ts` - Implementación del servicio
- `apps/api/src/entities/project-permission.entity.ts` - Entidad de permisos
- `apps/api/src/projects/projects.service.ts` - Ejemplo completo de implementación
- `apps/api/src/search/search.service.ts` - Ejemplo de búsqueda con filtrado

---

**Última actualización**: 2025-01-20
**Estado**: Implementación en progreso - Algunos servicios aún necesitan actualización

