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
import { SequencesService } from './sequences.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { FilterSequencesDto } from './dto/filter-sequences.dto';
import { Sequence } from '../entities/sequence.entity';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions, Permission } from '../auth/decorators/permissions.decorator';
import { UserRateLimit } from '../common/guards/user-rate-limit.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserContext } from '../auth/services/project-access.service';

@ApiTags('Secuencias')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@Controller('sequences')
export class SequencesController {
  constructor(private readonly sequencesService: SequencesService) {}

  @Post()
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @RequirePermissions(Permission.SEQUENCE_CREATE)
  @ApiOperation({
    summary: 'Crear una nueva secuencia',
    description: `
Crea una nueva secuencia dentro de un episodio específico. Las secuencias constituyen los bloques principales de contenido de un episodio.

**Concepto de Secuencia:**
Una secuencia es una unidad narrativa completa. Las secuencias se organizan dentro de episodios mediante \`cutOrder\` para establecer el orden de montaje final.

**Relación con Versiones:**
Las secuencias tienen versiones asociadas mediante el sistema de versiones (\`POST /versions\` con \`entityType="sequence"\`). Las versiones de secuencias contienen imágenes como storyboards estáticos, frames clave o layouts (PNG, JPG, WEBP).

La UI muestra estas imágenes automáticamente en el visor de versiones.

**Proceso de Creación:**
1. Se crea la secuencia con los metadatos básicos (nombre, descripción, cutOrder)
2. Se asocia automáticamente al episodio mediante \`episodeId\`
3. Se crea una versión inicial automáticamente (opcional, se puede crear manualmente después)
4. Las versiones posteriores se crean con \`POST /versions\` o \`POST /versions/sequence\`

**Casos de Uso:**
- **Producción Visual**: Secuencias con storyboards estáticos, layouts, frames clave y referencias visuales.

- Las versiones de secuencias se crean con \`entityType="sequence"\` y \`entityCode\` de la secuencia
- El campo \`filePath\` en la versión debe contener imágenes (.png, .jpg, .webp)
- Para crear secuencia con versión personalizada, usar \`POST /versions/sequence\`
    `,
  })
  @ApiBody({
    type: CreateSequenceDto,
    description: 'Datos necesarios para crear una nueva secuencia',
  })
  @ApiResponse({
    status: 201,
    description: 'Secuencia creada exitosamente',
    type: Sequence,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o episodio no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Episodio no encontrado o datos inválidos',
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
  create(@Body() createSequenceDto: CreateSequenceDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.sequencesService.create(createSequenceDto, userContext);
  }

  @Get()
  @RequirePermissions(Permission.SEQUENCE_READ)
  @ApiOperation({
    summary: 'Obtener todas las secuencias con filtros opcionales',
    description: `
Recupera una lista de secuencias registradas en el sistema con capacidad de filtrado avanzado. Las secuencias organizan el contenido en orden narrativo dentro de episodios.

**Sistema de Filtrado:**
- **status**: Filtro exacto por estado de la secuencia (wip, review, approved, etc.)
- **episodeId**: Filtro exacto por ID del episodio (integer)
- **cutOrder**: Filtro exacto por orden de corte (número)
- **createdBy**: Filtro por ID del usuario creador (igualdad exacta)
- **assignedTo**: Filtro por ID del usuario asignado (igualdad exacta)

**Características:**
- Todos los filtros son opcionales y se pueden combinar
- Las búsquedas de texto son parciales (contienen el término)
- Sin filtros devuelve todas las secuencias ordenadas por \`cutOrder\` ascendente
- Respuesta incluye metadatos de secuencia pero NO incluye versiones automáticamente

**Versiones de Secuencias:**
Las versiones NO se incluyen en esta respuesta. Para obtener versiones de una secuencia:
- \`GET /versions?entityCode={sequence.code}&entityType=sequence\`
- \`GET /versions?entityId={sequence.id}&entityType=sequence\`

**Imágenes en Versiones:**
Las versiones de secuencias contienen imágenes:
- Storyboards estáticos, layouts, frames clave (PNG, JPG, WEBP)

**Ejemplos de uso:**
- \`GET /sequences\` - Todas las secuencias del sistema
- \`GET /sequences?status=in_progress\` - Solo secuencias en progreso
- \`GET /sequences?episodeId=123\` - Secuencias de un episodio específico
- \`GET /sequences?cutOrder=1&status=approved\` - Primera secuencia aprobada
- \`GET /sequences?createdBy=storyboard@studio.com\` - Secuencias creadas por usuario

**Notas para IA:**
- El campo \`cutOrder\` determina el orden de montaje dentro del episodio
- Las versiones se obtienen por separado usando el endpoint de versions
- La aplicación está optimizada para el manejo de imágenes (storyboards/layouts)
    `,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filtrar secuencias por código de estado exacto. Los valores dependen de los status configurados en el sistema.',
    example: 'in_progress',
    schema: {
      type: 'string',
    },
  })
  @ApiQuery({
    name: 'episodeId',
    required: false,
    type: 'string',
    description: 'Filtrar secuencias por ID del episodio al que pertenecen usando filtro exacto',
    example: '550e8400-e29b-41d4-a716-446655440001',
    schema: {
      type: 'string',
      format: 'uuid',
    },
  })
  @ApiQuery({
    name: 'cutOrder',
    required: false,
    type: 'number',
    description: 'Filtrar secuencias por orden de corte específico (número exacto)',
    example: 1,
    schema: {
      type: 'number',
      minimum: 1,
    },
  })
  @ApiQuery({
    name: 'createdBy',
    required: false,
    type: 'string',
    description:
      'Filtrar secuencias por usuario que las creó usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'storyboard@studio.com',
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
      'Filtrar secuencias por usuario asignado usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
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
      'Lista de secuencias obtenida exitosamente. La respuesta incluye todas las secuencias que coinciden con los filtros aplicados, ordenadas por cutOrder ascendente',
    type: [Sequence],
    schema: {
      type: 'array',
      items: {
        $ref: '#/components/schemas/Sequence',
      },
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          code: 'SEQ_001',
          name: 'Escena del Bosque Encantado',
          description: 'Los protagonistas se adentran en el bosque mágico',
          cutOrder: 1,
          status: 'in_progress',
          duration: 120,
          storyId: 'STORY_EP01_001',
          createdBy: 'storyboard@studio.com',
          assignedTo: 'animator@studio.com',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-20T15:45:00Z',
          episode: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            code: 'EP_001',
            name: 'El Inicio de la Aventura',
          },
          episodeId: '550e8400-e29b-41d4-a716-446655440001',
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
        message: { type: 'string', example: 'Error al obtener las secuencias' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  findAll(@Query() filters: FilterSequencesDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.sequencesService.findAll(filters, userContext);
  }

  @Get(':id')
  @RequirePermissions(Permission.SEQUENCE_READ)
  @ApiOperation({
    summary: 'Obtener secuencia por ID',
    description: `
Recupera una secuencia específica utilizando su ID único (integer), incluyendo todas las relaciones asociadas con el episodio.

**Información Retornada:**
- Metadatos de la secuencia: código, nombre, descripción, cutOrder, duración
- Relación con episodio: \`episodeId\` y datos del episodio asociado
- Estado: \`statusId\` y estado actual en el workflow
- Asignaciones: \`createdBy\`, \`assignedTo\` para tracking de responsabilidades
- Timestamps: \`createdAt\`, \`updatedAt\` para auditoría
- Timestamps: \`createdAt\`, \`updatedAt\` para auditoría

**Versiones de la Secuencia:**
Las versiones de la secuencia NO se incluyen automáticamente en esta respuesta. Para obtener las versiones:
- Usar \`GET /versions?entityCode={sequence.code}&entityType=sequence\`
- O \`GET /versions?entityId={sequence.id}&entityType=sequence\`

**Imágenes en Versiones:**
Las versiones de esta secuencia contienen imágenes como storyboards, layouts o frames clave (PNG, JPG, WEBP).

**Uso Típico:**
- Ver detalles completos de una secuencia en la UI
- Obtener información antes de actualizar (PATCH)
- Verificar existencia y estado de una secuencia
- Verificar existencia y estado de una secuencia
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la secuencia (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Secuencia encontrada exitosamente',
    type: Sequence,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de secuencia inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid sequence ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Secuencia no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Sequence with ID 999 not found' },
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
        message: { type: 'string', example: 'Error al obtener la secuencia' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.sequencesService.findOneById(id, userContext);
  }

  @Patch(':id')
  @UserRateLimit({ limit: 200, ttl: 60000 })
  @RequirePermissions(Permission.SEQUENCE_UPDATE)
  @ApiOperation({
    summary: 'Actualizar secuencia existente',
    description:
      'Actualiza parcial o completamente los datos de una secuencia existente. Permite modificar cualquier campo incluyendo el orden de montaje.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la secuencia a actualizar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiBody({
    type: UpdateSequenceDto,
    description: 'Datos a actualizar de la secuencia (campos opcionales)',
  })
  @ApiResponse({
    status: 200,
    description: 'Secuencia actualizada exitosamente',
    type: Sequence,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o ID inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid sequence ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Secuencia no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Sequence with ID 999 not found' },
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
          example: "Sequence with code 'SEQ' already exists",
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
        message: {
          type: 'string',
          example: 'Error al actualizar la secuencia',
        },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSequenceDto: UpdateSequenceDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.sequencesService.update(id, updateSequenceDto, userContext);
  }

  @Delete(':id')
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @RequirePermissions(Permission.SEQUENCE_DELETE)
  @ApiOperation({
    summary: 'Eliminar secuencia',
    description:
      'Elimina permanentemente una secuencia del sistema. Esta acción también eliminará en cascada todas las versiones asociadas a la secuencia.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la secuencia a eliminar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Secuencia eliminada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Secuencia eliminada exitosamente',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID de secuencia inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid sequence ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Secuencia no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Sequence with ID 999 not found' },
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
        message: { type: 'string', example: 'Error al eliminar la secuencia' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    await this.sequencesService.remove(id, userContext);
    return { message: 'Secuencia eliminada exitosamente' };
  }
}
