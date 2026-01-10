import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StatusesService } from './statuses.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FilterStatusesDto } from './dto/filter-statuses.dto';
import { Status } from '../entities/status.entity';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions, Permission } from '../auth/decorators/permissions.decorator';
import { UserRateLimit } from '../common/guards/user-rate-limit.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Statuses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@Controller('statuses')
export class StatusesController {
  constructor(private readonly statusesService: StatusesService) {}

  @Post()
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @RequirePermissions(Permission.STATUS_CREATE)
  @ApiOperation({
    summary: 'Crear un nuevo estado',
    description: `
    Crea un nuevo estado personalizado que puede ser aplicado a diferentes entidades del sistema.

    **Tipos de entidades aplicables:**
    - \`project\`: Estados para proyectos (bidding, active, onhold, completed)
    - \`episode\`: Estados para episodios (active, completed)
    - \`sequence\`: Estados para secuencias (ip, rev, fin)
    - \`version\`: Estados para versiones (rev, app, fin, rdy)
    - \`asset\`: Estados para assets (wtg, ip, rev, app, fin)
    - \`note\`: Estados para notas (activo, resuelto, archivado)
    - \`all\`: Aplica a todas las entidades

    **Campos requeridos:**
    - \`code\`: Código único identificador
    - \`name\`: Nombre descriptivo
    - \`color\`: Color hexadecimal
    - \`applicableEntities\`: Array de entidades aplicables

    **Campos opcionales:**
    - \`description\`: Descripción detallada
    - \`isActive\`: Estado activo (default: true)
    - \`sortOrder\`: Orden de clasificación (default: 0)
    - \`createdBy\`: Usuario creador
    - \`assignedTo\`: Usuario responsable
    `,
  })
  @ApiBody({
    type: CreateStatusDto,
    description: 'Datos necesarios para crear un nuevo estado',
    examples: {
      production_status: {
        summary: 'Estado de producción',
        description: 'Ejemplo de estado para pipeline de producción',
        value: {
          code: 'ANIMATION',
          name: 'En Animación',
          description: 'La secuencia está en proceso de animación',
          color: '#8B5CF6',
          isActive: true,
          sortOrder: 15,
          applicableEntities: ['sequence'],
          createdBy: 'supervisor@studio.com',
          assignedTo: 'lead-animator@studio.com',
        },
      },
      project_status: {
        summary: 'Estado de proyecto',
        description: 'Ejemplo de estado para gestión de proyectos',
        value: {
          code: 'PRE_PRODUCTION',
          name: 'Pre-Producción',
          description: 'Proyecto en fase de pre-producción, definiendo conceptos y pipeline',
          color: '#F59E0B',
          isActive: true,
          sortOrder: 5,
          applicableEntities: ['project'],
          createdBy: 'producer@studio.com',
          assignedTo: 'project-manager@studio.com',
        },
      },
      universal_status: {
        summary: 'Estado universal',
        description: 'Ejemplo de estado que aplica a todas las entidades',
        value: {
          code: 'BLOCKED',
          name: 'Bloqueado',
          description: 'Elemento bloqueado por dependencias externas o problemas técnicos',
          color: '#EF4444',
          isActive: true,
          sortOrder: 99,
          applicableEntities: ['all'],
          createdBy: 'admin@studio.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Estado creado exitosamente con todas las propiedades configuradas',
    type: Status,
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        code: 'ANIMATION',
        name: 'En Animación',
        description: 'La secuencia está en proceso de animación',
        color: '#8B5CF6',
        isActive: true,
        sortOrder: 15,
        applicableEntities: ['sequence'],
        createdBy: 'supervisor@studio.com',
        assignedTo: 'lead-animator@studio.com',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'code should not be empty',
            'color must be a hexadecimal color',
            'applicableEntities should not be empty',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Código de estado duplicado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Status with code ANIMATION already exists',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Error interno del servidor' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  create(@Body() createStatusDto: CreateStatusDto, @CurrentUser() currentUser?: User) {
    const userId = currentUser?.id || null;
    return this.statusesService.create(createStatusDto, userId);
  }

  @Get()
  @RequirePermissions(Permission.STATUS_READ)
  @ApiOperation({
    summary: 'Obtener todos los estados con filtros opcionales',
    description: `
    Recupera una lista de estados registrados en el sistema con capacidad de filtrado avanzado.

    **Filtros disponibles:**
    - **isActive**: Filtro exacto por estado activo/inactivo
    - **applicableEntities**: Filtro por entidades aplicables (acepta múltiples valores)
    - **color**: Filtro exacto por color hexadecimal
    - **createdBy**: Búsqueda parcial en usuario creador (no sensible a mayúsculas)
    - **assignedTo**: Búsqueda parcial en usuario asignado (no sensible a mayúsculas)
    - **code**: Búsqueda parcial en código del status (no sensible a mayúsculas)
    - **name**: Búsqueda parcial en nombre del status (no sensible a mayúsculas)

    **Características:**
    - Todos los filtros son opcionales
    - Se pueden combinar múltiples filtros
    - Las búsquedas de texto son parciales (contienen el término)
    - Sin filtros devuelve todos los estados ordenados por sortOrder, nombre y fecha

    **Ejemplos de uso:**
    - \`GET /statuses\` - Todos los estados
    - \`GET /statuses?isActive=true\` - Solo estados activos
    - \`GET /statuses?applicableEntities=episode,asset\` - Estados aplicables a episodios o assets
    - \`GET /statuses?color=%23FF0000&isActive=true\` - Estados rojos y activos
    `,
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: 'boolean',
    description: 'Filtrar estados por estado activo/inactivo',
    example: true,
    schema: {
      type: 'boolean',
    },
  })
  @ApiQuery({
    name: 'applicableEntities',
    required: false,
    type: [String],
    description:
      'Filtrar estados que sean aplicables a cualquiera de las entidades especificadas. Acepta múltiples valores separados por coma',
    example: 'episode,asset',
    schema: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['project', 'episode', 'sequence', 'version', 'asset', 'note', 'all'],
      },
    },
  })
  @ApiQuery({
    name: 'color',
    required: false,
    type: 'string',
    description: 'Filtrar estados por color hexadecimal exacto',
    example: '#FF0000',
    schema: {
      type: 'string',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
  })
  @ApiQuery({
    name: 'createdBy',
    required: false,
    type: 'string',
    description:
      'Filtrar estados por usuario que los creó usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'admin@studio.com',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
    },
  })
  @ApiQuery({
    name: 'assignedTo',
    required: false,
    type: 'string',
    description:
      'Filtrar estados por usuario asignado usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'supervisor@studio.com',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
    },
  })
  @ApiQuery({
    name: 'code',
    required: false,
    type: 'string',
    description:
      'Filtrar estados por código usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'PROGRESS',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: 'string',
    description:
      'Filtrar estados por nombre usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'Review',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de estados obtenida exitosamente. La respuesta incluye todos los estados que coinciden con los filtros aplicados, ordenados por sortOrder, nombre y fecha de creación',
    type: [Status],
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de filtro inválidos',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['isActive must be a boolean value'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  findAll(@Query() filters: FilterStatusesDto) {
    return this.statusesService.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions(Permission.STATUS_READ)
  @ApiOperation({
    summary: 'Obtener estado por ID',
    description: 'Recupera un estado específico utilizando su identificador único',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del estado',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado encontrado exitosamente',
    type: Status,
  })
  @ApiResponse({
    status: 404,
    description: 'Estado no encontrado',
  })
  findOne(@Param('id') id: string) {
    return this.statusesService.findOne(id);
  }

  @Patch(':id')
  @UserRateLimit({ limit: 200, ttl: 60000 })
  @RequirePermissions(Permission.STATUS_UPDATE)
  @ApiOperation({
    summary: 'Actualizar estado existente',
    description: `
    Actualiza parcial o completamente los datos de un estado existente.

    **Campos actualizables:**
    - \`code\`: Código único identificador
    - \`name\`: Nombre descriptivo
    - \`description\`: Descripción detallada
    - \`color\`: Color hexadecimal
    - \`isActive\`: Estado activo/inactivo
    - \`sortOrder\`: Orden de clasificación
    - \`applicableEntities\`: Array de entidades aplicables
    - \`createdBy\`: Usuario creador
    - \`assignedTo\`: Usuario responsable

    **Consideraciones importantes:**
    - Todos los campos son opcionales en una actualización
    - El cambio de \`applicableEntities\` puede afectar entidades existentes
    - Cambiar \`isActive\` a false puede afectar el sistema
    - El \`sortOrder\` afecta el orden de visualización
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del estado a actualizar',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateStatusDto,
    description: 'Datos a actualizar del estado (todos los campos son opcionales)',
    examples: {
      update_color_order: {
        summary: 'Actualizar color y orden',
        description: 'Ejemplo de actualización de color y orden de un estado',
        value: {
          color: '#00FF00',
          sortOrder: 25,
          description: 'Estado actualizado con nuevo color verde y orden modificado',
        },
      },
      deactivate_status: {
        summary: 'Desactivar estado',
        description: 'Ejemplo de cómo desactivar un estado del sistema',
        value: {
          isActive: false,
          description: 'Estado desactivado temporalmente por mantenimiento',
        },
      },
      expand_entities: {
        summary: 'Expandir entidades aplicables',
        description: 'Ejemplo de cómo expandir las entidades donde aplica un estado',
        value: {
          applicableEntities: ['sequence', 'asset', 'version'],
          assignedTo: 'new-supervisor@studio.com',
          description: 'Estado expandido para aplicar a más tipos de entidades',
        },
      },
      complete_update: {
        summary: 'Actualización completa',
        description: 'Ejemplo de actualización completa de todos los campos',
        value: {
          code: 'COMPOSITING_UPD',
          name: 'Compositing - Updated',
          description:
            'Estado actualizado para el proceso de compositing con nuevas especificaciones',
          color: '#9333EA',
          isActive: true,
          sortOrder: 30,
          applicableEntities: ['sequence', 'version'],
          assignedTo: 'comp-supervisor@studio.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente con los nuevos valores',
    type: Status,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        code: 'COMPOSITING_UPD',
        name: 'Compositing - Updated',
        description:
          'Estado actualizado para el proceso de compositing con nuevas especificaciones',
        color: '#9333EA',
        isActive: true,
        sortOrder: 30,
        applicableEntities: ['sequence', 'version'],
        createdBy: 'admin@studio.com',
        assignedTo: 'comp-supervisor@studio.com',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T14:45:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['color must be a hexadecimal color', 'sortOrder must be a number'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Estado no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Status with ID 550e8400-e29b-41d4-a716-446655440000 not found',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Error interno del servidor' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  update(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.statusesService.update(id, updateStatusDto);
  }

  @Delete(':id')
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @RequirePermissions(Permission.STATUS_DELETE)
  @ApiOperation({
    summary: 'Eliminar estado',
    description:
      'Elimina permanentemente un estado del sistema. CUIDADO: Esto puede afectar entidades que estén usando este estado',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del estado a eliminar',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Estado eliminado exitosamente' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Estado no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar el estado porque está siendo utilizado por otras entidades',
  })
  async remove(@Param('id') id: string) {
    await this.statusesService.remove(id);
    return { message: 'Estado eliminado exitosamente' };
  }
}
