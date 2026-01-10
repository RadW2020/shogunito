import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  UseGuards,
  ParseIntPipe,
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
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { FilterPlaylistsDto } from './dto/filter-playlists.dto';
import { CreatePlaylistFromVersionsDto } from './dto/create-playlist-from-versions.dto';
import { Playlist } from '../entities/playlist.entity';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions, Permission } from '../auth/decorators/permissions.decorator';
import { UserRateLimit } from '../common/guards/user-rate-limit.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserContext } from '../auth/services/project-access.service';

@ApiTags('Playlists')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post()
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @RequirePermissions(Permission.PLAYLIST_CREATE)
  @ApiOperation({
    summary: 'Crear una nueva playlist',
    description: `
    Crea una nueva playlist para agrupar versiones de shots y facilitar la revisión y aprobación de contenido.


    **Campos requeridos:**
    - \`code\`: Código único identificador
    - \`name\`: Nombre descriptivo de la playlist
    - \`projectId\`: ID del proyecto (debe existir)

    **Campos opcionales:**
    - \`description\`: Descripción del propósito
    - \`status\`: Estado inicial (default: wtg)
    - \`versionIds\`: Array de IDs de versiones incluidas
    - \`createdBy\`: Usuario creador
    - \`assignedTo\`: Usuario asignado para revisión
    `,
  })
  @ApiBody({
    type: CreatePlaylistDto,
    description: 'Datos necesarios para crear una nueva playlist',
    examples: {
      rough_cut: {
        summary: 'Playlist de Rough Cut',
        description: 'Ejemplo de playlist para revisión de rough cut de episodio',
        value: {
          code: 'PL_EP002_ROUGH',
          name: 'Episode 2 - Rough Cut Review',
          description:
            'Playlist con el rough cut del episodio 2 para revisión interna del equipo de dirección',
          status: 'waiting',
          projectId: 'b899d424-0d20-451d-af78-e965d0d6d717',
          versionIds: [
            '123e4567-e89b-12d3-a456-426614174000',
            '456e7890-e12b-34d5-a678-426614174001',
          ],
          createdBy: 'editor@studio.com',
          assignedTo: 'director@studio.com',
        },
      },
      client_review: {
        summary: 'Playlist de Client Review',
        description: 'Ejemplo de playlist para revisión final con cliente',
        value: {
          code: 'PL_EP001_CLIENT',
          name: 'Episode 1 - Client Final Review',
          description:
            'Playlist con las versiones finales del episodio 1 para aprobación definitiva del cliente',
          status: 'review',
          projectId: 'b899d424-0d20-451d-af78-e965d0d6d717',
          versionIds: [
            '789e0123-e45b-67d8-a901-426614174000',
            'abc1234e-f56g-78h9-i012-345678901234',
          ],
          createdBy: 'supervisor@studio.com',
          assignedTo: 'client@studio.com',
        },
      },
      empty_playlist: {
        summary: 'Playlist vacía',
        description: 'Ejemplo de playlist sin versiones, lista para agregar contenido',
        value: {
          code: 'PL_EP003_WIP',
          name: 'Episode 3 - Work in Progress',
          description: 'Playlist preparada para recibir las nuevas versiones del episodio 3',
          projectId: 'b899d424-0d20-451d-af78-e965d0d6d717',
          createdBy: 'coordinator@studio.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Playlist creada exitosamente con todas las relaciones establecidas',
    type: Playlist,
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        code: 'PL_EP002_ROUGH',
        name: 'Episode 2 - Rough Cut Review',
        description:
          'Playlist con el rough cut del episodio 2 para revisión interna del equipo de dirección',
        status: 'waiting',
        versionIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '456e7890-e12b-34d5-a678-426614174001',
        ],
        createdBy: 'editor@studio.com',
        assignedTo: 'director@studio.com',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        projectId: 'b899d424-0d20-451d-af78-e965d0d6d717',
        project: {
          id: 'b899d424-0d20-451d-af78-e965d0d6d717',
          code: 'RAT',
          name: 'El Ratoncito Valiente',
        },
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
            'name should not be empty',
            'projectId must be a valid UUID',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Proyecto no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Project with ID b899d424-0d20-451d-af78-e965d0d6d717 not found',
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
  create(@Body() createPlaylistDto: CreatePlaylistDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.playlistsService.create(createPlaylistDto, userContext);
  }

  @Post('from-versions')
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @ApiOperation({
    summary: 'Crear playlist desde versiones seleccionadas',
    description: `
    Crea una nueva playlist a partir de un conjunto de versiones seleccionadas.
    Este endpoint es útil cuando se quiere crear una playlist desde la UI
    seleccionando múltiples versiones en el tab de versiones.

    **Características:**
    - Verifica que todas las versiones existan
    - Verifica que el proyecto exista
    - Crea la playlist con las versiones en el orden proporcionado
    - Soporte para versiones de diferentes entidades (shots, assets, sequences, etc.)

    **Campos requeridos:**
    - \`code\`: Código único identificador
    - \`name\`: Nombre descriptivo de la playlist
    - \`projectId\`: ID del proyecto (debe existir)
    - \`versionCodes\`: Array de códigos de versiones a incluir

    **Campos opcionales:**
    - \`description\`: Descripción del propósito
    - \`status\`: Estado inicial (default: waiting)
    - \`createdBy\`: Usuario creador
    - \`assignedTo\`: Usuario asignado para revisión
    `,
  })
  @ApiBody({
    type: CreatePlaylistFromVersionsDto,
    description: 'Datos necesarios para crear una playlist desde versiones seleccionadas',
    examples: {
      basic: {
        summary: 'Crear playlist básica',
        description: 'Ejemplo básico de creación de playlist desde versiones',
        value: {
          code: 'PL_REVIEW',
          name: 'Review Playlist - Selected Versions',
          projectId: 'aac81fe1-5ef7-466b-9c49-6537b477c0fe',
          versionCodes: ['SH_003', 'SEQ_002', 'EP_001'],
        },
      },
      complete: {
        summary: 'Crear playlist completa',
        description: 'Ejemplo completo con todos los campos para creación de playlist',
        value: {
          code: 'PL_CLIENT_REVIEW',
          name: 'Client Review - Episode 1',
          description: 'Playlist generada desde versiones seleccionadas para revisión del cliente',
          projectId: 'aac81fe1-5ef7-466b-9c49-6537b477c0fe',
          versionCodes: ['SH_003', 'SH_005', 'SEQ_002', 'EP_001'],
          status: 'review',
          createdBy: 'editor@studio.com',
          assignedTo: 'client@studio.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Playlist creada exitosamente desde versiones seleccionadas',
    type: Playlist,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o versiones no encontradas',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'One or more versions do not exist. Please verify all version codes.',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Proyecto no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Project with ID aac81fe1-5ef7-466b-9c49-6537b477c0fe not found',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  createFromVersions(
    @Body() createPlaylistFromVersionsDto: CreatePlaylistFromVersionsDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.playlistsService.createFromVersions(createPlaylistFromVersionsDto, userContext);
  }

  @Get()
  @RequirePermissions(Permission.PLAYLIST_READ)
  @ApiOperation({
    summary: 'Obtener todas las playlists con filtros opcionales',
    description: `
    Recupera una lista de playlists registradas en el sistema con capacidad de filtrado avanzado.

    **Filtros disponibles:**
    - **status**: Filtro exacto por estado de la playlist
    - **projectId**: Filtro exacto por ID del proyecto
    - **createdBy**: Búsqueda parcial en usuario creador (no sensible a mayúsculas)
    - **assignedTo**: Búsqueda parcial en usuario asignado (no sensible a mayúsculas)
    - **code**: Búsqueda parcial en código de la playlist (no sensible a mayúsculas)
    - **name**: Búsqueda parcial en nombre de la playlist (no sensible a mayúsculas)

    **Características:**
    - Todos los filtros son opcionales
    - Se pueden combinar múltiples filtros
    - Las búsquedas de texto son parciales (contienen el término)
    - Sin filtros devuelve todas las playlists ordenadas por fecha de creación

    **Ejemplos de uso:**
    - \`GET /playlists\` - Todas las playlists
    - \`GET /playlists?status=review\` - Solo playlists en revisión
    - \`GET /playlists?projectId=uuid&status=in_progress\` - Playlists en progreso de un proyecto específico
    - \`GET /playlists?assignedTo=director&status=waiting\` - Playlists esperando asignadas al director
    `,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filtrar playlists por código de estado exacto. Los valores dependen de los status configurados en el sistema.',
    example: 'review',
    schema: {
      type: 'string',
    },
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: 'string',
    description: 'Filtrar playlists por ID del proyecto al que pertenecen usando filtro exacto',
    example: 'b899d424-0d20-451d-af78-e965d0d6d717',
    schema: {
      type: 'string',
      format: 'uuid',
    },
  })
  @ApiQuery({
    name: 'createdBy',
    required: false,
    type: 'string',
    description:
      'Filtrar playlists por usuario que las creó usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'editor@studio.com',
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
      'Filtrar playlists por usuario asignado usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'director@studio.com',
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
      'Filtrar playlists por código usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'EP001',
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
      'Filtrar playlists por nombre usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'Rough Cut',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de playlists obtenida exitosamente. La respuesta incluye todas las playlists que coinciden con los filtros aplicados, ordenadas por fecha de creación',
    type: [Playlist],
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
          example: ['status must be one of the following values: wtg, ip, rev, app, fin'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  findAll(@Query() filters: FilterPlaylistsDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.playlistsService.findAll(filters, userContext);
  }

  @Get(':id')
  @RequirePermissions(Permission.PLAYLIST_READ)
  @ApiOperation({
    summary: 'Obtener playlist por ID',
    description:
      'Recupera una playlist específica utilizando su ID único (integer), incluyendo todas las versiones asociadas',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la playlist (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Playlist encontrada exitosamente',
    type: Playlist,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid playlist ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Playlist no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Playlist with ID 999 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.playlistsService.findOneById(id, userContext);
  }

  @Patch(':id')
  @UserRateLimit({ limit: 200, ttl: 60000 })
  @RequirePermissions(Permission.PLAYLIST_UPDATE)
  @ApiOperation({
    summary: 'Actualizar playlist existente',
    description: `
    Actualiza parcial o completamente los datos de una playlist existente, incluyendo el estado y las versiones asociadas.

    **Campos actualizables:**
    - \`code\`: Código único identificador
    - \`name\`: Nombre descriptivo
    - \`description\`: Descripción del propósito
    - \`status\`: Estado de la playlist
    - \`versionCodes\`: Array de códigos de versiones (reemplaza completamente la lista anterior)
    - \`createdBy\`: Usuario creador
    - \`assignedTo\`: Usuario asignado para revisión
    - \`projectId\`: ID del proyecto (cambia la asociación)

    **Consideraciones importantes:**
    - Todos los campos son opcionales en una actualización
    - El cambio de \`projectId\` reasigna la playlist a otro proyecto
    - Actualizar \`versionCodes\` reemplaza completamente la lista de versiones
    - El cambio de \`status\` puede afectar el workflow de revisión
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la playlist a actualizar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiBody({
    type: UpdatePlaylistDto,
    description: 'Datos a actualizar de la playlist (todos los campos son opcionales)',
    examples: {
      status_update: {
        summary: 'Actualizar estado',
        description: 'Ejemplo de actualización del estado de la playlist durante el workflow',
        value: {
          status: 'review',
          assignedTo: 'client@studio.com',
          description: 'Playlist enviada al cliente para revisión final',
        },
      },
      add_versions: {
        summary: 'Agregar versiones',
        description: 'Ejemplo de actualización agregando nuevas versiones a la playlist',
        value: {
          versionIds: [
            '123e4567-e89b-12d3-a456-426614174000',
            '456e7890-e12b-34d5-a678-426614174001',
            'new789e0-e45b-67d8-a901-426614174002',
          ],
          name: 'Episode 1 - Final Review (Updated)',
          status: 'in_progress',
        },
      },
      change_assignment: {
        summary: 'Cambiar asignación',
        description: 'Ejemplo de reasignación de playlist a otro revisor',
        value: {
          assignedTo: 'senior-director@studio.com',
          description: 'Playlist reasignada al director senior para revisión final',
        },
      },
      complete_update: {
        summary: 'Actualización completa',
        description: 'Ejemplo de actualización completa de todos los campos de la playlist',
        value: {
          code: 'PL_EP001_FINAL_2',
          name: 'Episode 1 - Final Review V2',
          description:
            'Playlist actualizada con las versiones corregidas después de los comentarios del cliente',
          status: 'approved',
          versionIds: [
            '789e0123-e45b-67d8-a901-426614174000',
            'abc1234e-f56g-78h9-i012-345678901234',
            'def5678f-g90h-12i3-j456-789012345678',
          ],
          assignedTo: 'production-manager@studio.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Playlist actualizada exitosamente con los nuevos valores',
    type: Playlist,
    schema: {
      example: {
        id: 123,
        code: 'PL_EP001_FINAL_2',
        name: 'Episode 1 - Final Review V2',
        description:
          'Playlist actualizada con las versiones corregidas después de los comentarios del cliente',
        status: 'approved',
        versionCodes: ['V001', 'V002', 'V003'],
        createdBy: 'editor@studio.com',
        assignedTo: 'production-manager@studio.com',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T16:45:00Z',
        projectId: 456,
        project: {
          id: 456,
          code: 'RAT',
          name: 'El Ratoncito Valiente',
        },
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
          example: ['status must be one of the following values: wtg, ip, rev, app, fin'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Playlist o proyecto no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Playlist with code PL not found',
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
  @ApiResponse({
    status: 409,
    description: 'Conflicto: código duplicado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: "Playlist with code 'PL001' already exists",
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlaylistDto: UpdatePlaylistDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.playlistsService.update(id, updatePlaylistDto, userContext);
  }

  @Delete(':id')
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @RequirePermissions(Permission.PLAYLIST_DELETE)
  @ApiOperation({
    summary: 'Eliminar playlist',
    description:
      'Elimina permanentemente una playlist del sistema. Las versiones asociadas no se eliminan, solo se desvinculan de la playlist',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la playlist a eliminar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Playlist eliminada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Playlist eliminada exitosamente' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid playlist ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Playlist no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Playlist with ID 999 not found',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    await this.playlistsService.remove(id, userContext);
    return { message: 'Playlist eliminada exitosamente' };
  }

  // Endpoints para gestionar versiones en la playlist
  @Post(':id/versions')
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @ApiOperation({
    summary: 'Agregar versión a playlist',
    description: 'Agrega una versión específica a la playlist en la posición indicada',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la playlist (integer)',
    example: 123,
    type: 'number',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        versionCode: {
          type: 'string',
          description: 'Código de la versión a agregar',
          example: 'SH_003',
        },
        position: {
          type: 'number',
          description: 'Posición en la playlist (opcional, por defecto al final)',
          example: 2,
        },
      },
      required: ['versionCode'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Versión agregada exitosamente',
    type: 'object',
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido o versión ya existe',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid playlist ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Playlist o versión no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Playlist with ID 999 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async addVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { versionCode: string; position?: number },
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.playlistsService.addVersion(id, body.versionCode, body.position, userContext);
  }

  @Delete(':id/versions/:versionCode')
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @RequirePermissions(Permission.PLAYLIST_DELETE)
  @ApiOperation({
    summary: 'Borrar versión de playlist',
    description: 'Borra una versión específica de la playlist',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la playlist (integer)',
    example: 123,
    type: 'number',
  })
  @ApiParam({
    name: 'versionCode',
    description: 'Código de la versión a remover',
    example: 'SH_003',
  })
  @ApiResponse({
    status: 200,
    description: 'Versión borrada exitosamente',
    type: 'object',
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid playlist ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Playlist no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Playlist with ID 999 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async removeVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('versionCode') versionCode: string,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.playlistsService.removeVersion(id, versionCode, userContext);
  }

  @Put(':id/versions/reorder')
  @UserRateLimit({ limit: 200, ttl: 60000 })
  @ApiOperation({
    summary: 'Reordenar versiones en playlist',
    description: 'Reordena las versiones en la playlist según el array proporcionado',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la playlist (integer)',
    example: 123,
    type: 'number',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        versionCodes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array de códigos de versiones en el nuevo orden',
          example: ['EP_001', 'SEQ_002', 'SH_003'],
        },
      },
      required: ['versionCodes'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Versiones reordenadas exitosamente',
    type: 'object',
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido o versiones no encontradas',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid playlist ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Playlist no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Playlist with ID 999 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async reorderVersions(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { versionCodes: string[] },
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.playlistsService.reorderVersions(id, body.versionCodes, userContext);
  }
}
