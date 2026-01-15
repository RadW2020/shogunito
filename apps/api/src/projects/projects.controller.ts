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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import { Project } from '../entities/project.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions, Permission } from '../auth/decorators/permissions.decorator';
import { UserRateLimit } from '../common/guards/user-rate-limit.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities';
import { UserContext } from '../auth/services/project-access.service';

@ApiTags('Proyectos')
@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @RequirePermissions(Permission.PROJECT_CREATE)
  @ApiOperation({
    summary: 'Crear un nuevo proyecto',
    description:
      'Crea un nuevo proyecto de producción audiovisual con todos los datos necesarios para la gestión de episodios, secuencias, tomas y assets asociados.',
  })
  @ApiBody({
    type: CreateProjectDto,
    description: 'Datos necesarios para crear un nuevo proyecto',
  })
  @ApiResponse({
    status: 201,
    description: 'Proyecto creado exitosamente',
    type: Project,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o código de proyecto duplicado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'El código del proyecto ya existe',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes',
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
  create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() currentUser?: User) {
    return this.projectsService.create(createProjectDto, currentUser?.id || null);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los proyectos con filtros opcionales',
    description: `
    Recupera una lista de proyectos registrados en el sistema con capacidad de filtrado avanzado.

    **Filtros disponibles:**
    - **statusId**: Filtro exacto por ID del estado del proyecto
    - **clientName**: Búsqueda parcial en nombre del cliente (no sensible a mayúsculas)
    - **createdBy**: Filtro por ID del usuario creador (igualdad exacta)
    - **assignedTo**: No aplica (projects no tiene assigned_to)

    **Características:**
    - Todos los filtros son opcionales
    - Se pueden combinar múltiples filtros
    - Las búsquedas de texto son parciales (contienen el término)
    - Sin filtros devuelve todos los proyectos ordenados por fecha de creación

    **Ejemplos de uso:**
    - \`GET /projects\` - Todos los proyectos
    - \`GET /projects?statusId=123e4567-e89b-12d3-a456-426614174000\` - Solo proyectos con ese estado
    - \`GET /projects?clientName=Netflix\` - Proyectos cuyo cliente contenga "Netflix"
    - \`GET /projects?statusId=123e4567-e89b-12d3-a456-426614174000&clientName=Animation\` - Filtros combinados
    `,
  })
  @ApiQuery({
    name: 'statusId',
    required: false,
    type: 'string',
    format: 'uuid',
    description:
      'Filtrar proyectos por ID del estado. Debe ser un UUID válido de un estado existente en la tabla statuses',
    example: '123e4567-e89b-12d3-a456-426614174000',
    schema: {
      type: 'string',
      format: 'uuid',
    },
  })
  @ApiQuery({
    name: 'clientName',
    required: false,
    type: 'string',
    description:
      'Filtrar proyectos por nombre del cliente usando búsqueda parcial (ILIKE). No sensible a mayúsculas. Ejemplo: "Netflix" encuentra "Netflix Studios"',
    example: 'Netflix',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
    },
  })
  @ApiQuery({
    name: 'createdBy',
    required: false,
    type: 'string',
    description:
      'Filtrar proyectos por usuario que los creó usando búsqueda parcial (ILIKE). No sensible a mayúsculas. Ejemplo: "director" encuentra "director@studio.com"',
    example: 'director@studio.com',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
    },
  })
  // Note: projects table does not have assigned_to column
  // @ApiQuery({
  //   name: 'assignedTo',
  //   required: false,
  //   type: 'number',
  //   description: 'Filtrar proyectos por ID del usuario asignado (igualdad exacta)',
  //   example: 1,
  // })
  @ApiResponse({
    status: 200,
    description:
      'Lista de proyectos obtenida exitosamente. La respuesta incluye todos los proyectos que coinciden con los filtros aplicados, ordenados por fecha de creación descendente',
    type: [Project],
    headers: {
      'Content-Type': {
        description: 'Tipo de contenido de la respuesta',
        schema: {
          type: 'string',
          example: 'application/json',
        },
      },
    },
    schema: {
      type: 'array',
      items: {
        $ref: '#/components/schemas/Project',
      },
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          code: 'PROJ_001',
          name: 'Serie Animada Temporada 1',
          description: 'Producción de 12 episodios para serie animada',
          status: 'active',
          clientName: 'Netflix Studios',
          startDate: '2024-01-15',
          endDate: '2024-12-15',
          createdBy: 1,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-20T15:45:00Z',
          episodes: [],
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
          example: [
            'status must be one of the following values: active, bidding, onhold, completed',
          ],
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
        message: { type: 'string', example: 'Error al obtener los proyectos' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  findAll(@Query() filters: FilterProjectsDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.projectsService.findAll(filters, userContext);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener proyecto por ID',
    description:
      'Recupera un proyecto específico utilizando su identificador único (integer), incluyendo todos los episodios y relaciones asociadas.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del proyecto (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Proyecto encontrado exitosamente',
    type: Project,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid project ID' },
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
        message: { type: 'string', example: 'Project not found' },
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
        message: { type: 'string', example: 'Error al obtener el proyecto' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.projectsService.findOneById(id, userContext);
  }

  @Patch(':id')
  @UserRateLimit({ limit: 200, ttl: 60000 })
  @ApiOperation({
    summary: 'Actualizar proyecto existente',
    description:
      'Actualiza parcial o completamente los datos de un proyecto existente. Permite modificar cualquier campo del proyecto sin afectar las relaciones.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del proyecto a actualizar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiBody({
    type: UpdateProjectDto,
    description: 'Datos a actualizar del proyecto (campos opcionales)',
  })
  @ApiResponse({
    status: 200,
    description: 'Proyecto actualizado exitosamente',
    type: Project,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o ID inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid project ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Código duplicado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: "Code 'PROJ_001' already exists" },
        error: { type: 'string', example: 'Conflict' },
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
        message: { type: 'string', example: 'Project not found' },
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
        message: { type: 'string', example: 'Error al actualizar el proyecto' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.projectsService.update(id, updateProjectDto, userContext);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PROJECT_DELETE)
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @ApiOperation({
    summary: 'Eliminar proyecto',
    description:
      'Elimina permanentemente un proyecto del sistema. Esta acción también eliminará en cascada todos los episodios, secuencias, tomas y assets asociados.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del proyecto a eliminar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Proyecto eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Proyecto eliminado exitosamente' },
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
        message: { type: 'string', example: 'Invalid project ID' },
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
        message: { type: 'string', example: 'Project not found' },
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
        message: { type: 'string', example: 'Error al eliminar el proyecto' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    await this.projectsService.remove(id, userContext);
    return { message: 'Proyecto eliminado exitosamente' };
  }
}
