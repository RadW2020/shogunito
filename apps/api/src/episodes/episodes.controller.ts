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
import { EpisodesService } from './episodes.service';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';
import { FilterEpisodesDto } from './dto/filter-episodes.dto';
import { Episode } from '../entities/episode.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions, Permission } from '../auth/decorators/permissions.decorator';
import { UserRateLimit } from '../common/guards/user-rate-limit.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserContext } from '../auth/services/project-access.service';

@ApiTags('Episodios')
@Controller('episodes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}

  @Post()
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @RequirePermissions(Permission.EPISODE_CREATE)
  @ApiOperation({
    summary: 'Crear un nuevo episodio',
    description:
      'Crea un nuevo episodio dentro de un proyecto específico. El episodio contendrá secuencias y tomas que conforman la producción audiovisual.',
  })
  @ApiBody({
    type: CreateEpisodeDto,
    description: 'Datos necesarios para crear un nuevo episodio',
  })
  @ApiResponse({
    status: 201,
    description: 'Episodio creado exitosamente',
    type: Episode,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o proyecto no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Proyecto no encontrado o datos inválidos',
        },
        error: { type: 'string', example: 'Bad Request' },
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
  create(@Body() createEpisodeDto: CreateEpisodeDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.episodesService.create(createEpisodeDto, userContext);
  }

  @Get()
  @RequirePermissions(Permission.EPISODE_READ)
  @ApiOperation({
    summary: 'Obtener todos los episodios con filtros opcionales',
    description: `
    Recupera una lista de episodios registrados en el sistema con capacidad de filtrado avanzado.

    **Filtros disponibles:**
    - **status**: Filtro exacto por estado del episodio
    - **projectId**: Filtro exacto por ID del proyecto
    - **createdBy**: Búsqueda parcial en usuario creador (no sensible a mayúsculas)
    - **assignedTo**: Búsqueda parcial en usuario asignado (no sensible a mayúsculas)

    **Características:**
    - Todos los filtros son opcionales
    - Se pueden combinar múltiples filtros
    - Las búsquedas de texto son parciales (contienen el término)
    - Sin filtros devuelve todos los episodios ordenados por fecha de creación

    **Ejemplos de uso:**
    - \`GET /episodes\` - Todos los episodios
    - \`GET /episodes?status=in_progress\` - Solo episodios en progreso
    - \`GET /episodes?projectId=550e8400-e29b-41d4-a716-446655440000\` - Episodios de un proyecto específico
    - \`GET /episodes?status=waiting&createdBy=director\` - Filtros combinados
    `,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filtrar episodios por código de estado exacto. Los valores dependen de los status configurados en el sistema.',
    example: 'in_progress',
    schema: {
      type: 'string',
    },
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: 'string',
    description: 'Filtrar episodios por ID del proyecto al que pertenecen usando filtro exacto',
    example: '550e8400-e29b-41d4-a716-446655440000',
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
      'Filtrar episodios por usuario que los creó usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'director@studio.com',
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
      'Filtrar episodios por usuario asignado usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'animator@studio.com',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de episodios obtenida exitosamente. La respuesta incluye todos los episodios que coinciden con los filtros aplicados, ordenados por fecha de creación descendente',
    type: [Episode],
    schema: {
      type: 'array',
      items: {
        $ref: '#/components/schemas/Episode',
      },
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          code: 'EP_001',
          name: 'El Inicio de la Aventura',
          description: 'Primer episodio donde los protagonistas se conocen',
          status: 'in_progress',
          duration: 1440,
          frameRate: 24,
          createdBy: 'director@studio.com',
          assignedTo: 'animator@studio.com',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-20T15:45:00Z',
          project: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            code: 'PROJ_001',
            name: 'Serie Animada Temporada 1',
          },
          sequences: [],
          projectId: '550e8400-e29b-41d4-a716-446655440000',
        },
      ],
    },
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
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Error al obtener los episodios' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  findAll(@Query() filters: FilterEpisodesDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.episodesService.findAll(filters, userContext);
  }

  @Get(':id')
  @RequirePermissions(Permission.EPISODE_READ)
  @ApiOperation({
    summary: 'Obtener episodio por ID',
    description:
      'Recupera un episodio específico utilizando su ID único, incluyendo todas las secuencias y relaciones asociadas.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del episodio',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Episodio encontrado exitosamente',
    type: Episode,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de episodio inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid episode ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Episodio no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Episode with ID 999 not found' },
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
        message: { type: 'string', example: 'Error al obtener el episodio' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.episodesService.findOneById(id, userContext);
  }

  @Get(':id/duration')
  @RequirePermissions(Permission.EPISODE_READ)
  @ApiOperation({
    summary: 'Obtener episodio con duración calculada',
    description:
      'Recupera un episodio específico con la duración total calculada automáticamente basada en la suma de duraciones de todas sus secuencias y tomas.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del episodio',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Episodio con duración calculada obtenido exitosamente',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/Episode' },
        {
          type: 'object',
          properties: {
            calculatedDuration: {
              type: 'number',
              description: 'Duración total calculada en segundos',
              example: 1440,
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID de episodio inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid episode ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Episodio no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Episode with ID 999 not found' },
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
        message: {
          type: 'string',
          example: 'Error al calcular la duración del episodio',
        },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  findOneWithCalculatedDuration(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.episodesService.findOneWithCalculatedDuration(id, userContext);
  }

  @Patch(':id')
  @UserRateLimit({ limit: 200, ttl: 60000 })
  @RequirePermissions(Permission.EPISODE_UPDATE)
  @ApiOperation({
    summary: 'Actualizar episodio existente',
    description:
      'Actualiza parcial o completamente los datos de un episodio existente. Permite modificar cualquier campo del episodio sin afectar las secuencias asociadas.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del episodio a actualizar',
    example: 123,
    type: 'number',
  })
  @ApiBody({
    type: UpdateEpisodeDto,
    description: 'Datos a actualizar del episodio (campos opcionales)',
  })
  @ApiResponse({
    status: 200,
    description: 'Episodio actualizado exitosamente',
    type: Episode,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o ID de episodio inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid episode ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Episodio no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Episode with ID 999 not found' },
        error: { type: 'string', example: 'Not Found' },
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
          example: "Episode with code 'EP' already exists",
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
        message: { type: 'string', example: 'Error al actualizar el episodio' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEpisodeDto: UpdateEpisodeDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.episodesService.update(id, updateEpisodeDto, userContext);
  }

  @Delete(':id')
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @RequirePermissions(Permission.EPISODE_DELETE)
  @ApiOperation({
    summary: 'Eliminar episodio',
    description:
      'Elimina permanentemente un episodio del sistema. Esta acción también eliminará en cascada todas las secuencias, tomas y versiones asociadas.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del episodio a eliminar',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Episodio eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Episodio eliminado exitosamente' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID de episodio inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid episode ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Episodio no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Episode with ID 999 not found' },
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
        message: { type: 'string', example: 'Error al eliminar el episodio' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    await this.episodesService.remove(id, userContext);
    return { message: 'Episodio eliminado exitosamente' };
  }
}
