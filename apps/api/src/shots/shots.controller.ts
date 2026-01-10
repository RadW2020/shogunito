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
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ShotsService } from './shots.service';
import { CreateShotDto } from './dto/create-shot.dto';
import { UpdateShotDto } from './dto/update-shot.dto';
import { FilterShotsDto } from './dto/filter-shots.dto';
import { Shot } from '../entities/shot.entity';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions, Permission } from '../auth/decorators/permissions.decorator';
import { UserRateLimit } from '../common/guards/user-rate-limit.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserContext } from '../auth/services/project-access.service';

@ApiTags('Shots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@Controller('shots')
export class ShotsController {
  constructor(private readonly shotsService: ShotsService) {}

  @Post()
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @RequirePermissions(Permission.SHOT_CREATE)
  @ApiOperation({
    summary: 'Crear un nuevo shot',
    description: `
    Crea un nuevo shot dentro de una secuencia específica del proyecto. Los shots son las unidades básicas de trabajo en el pipeline de producción.

    **Características del shot:**
    - Se genera automáticamente un código único basado en la secuencia
    - Se asigna automáticamente el siguiente número de secuencia disponible
    - El estado por defecto es 'waiting' (waiting to go)
    - Se pueden especificar tipo de shot, duración, usuarios asignados y otros metadatos

    **Campos requeridos:**
    - \`code\`: Código único del shot
    - \`name\`: Nombre descriptivo
    - \`sequenceNumber\`: Número de orden en la secuencia
    - \`sequenceCode\`: Código de la secuencia padre (debe existir)

    **Ejemplo de uso:**
    \`\`\`json
    {
      "code": "SH001",
      "name": "Establishing Shot",
      "description": "Plano general que establece la ubicación",
      "sequenceNumber": 10,
      "sequenceCode": "SEQ001",
      "status": "wtg",
      "shotType": "establishing"
    }
    \`\`\`
    `,
  })
  @ApiBody({
    type: CreateShotDto,
    description: 'Datos necesarios para crear un nuevo shot',
    examples: {
      establishing: {
        summary: 'Shot establishing típico',
        description: 'Ejemplo de un shot de establecimiento básico',
        value: {
          code: 'SH001',
          name: 'Establishing Shot',
          description: 'Plano general que establece la ubicación principal de la escena',
          sequenceNumber: 1,
          sequenceId: '24208f1a-fb40-4d02-ae11-38acfcdb1054',
          status: 'waiting',
          shotType: 'establishing',
          duration: 120,
          cutOrder: 1,
          createdBy: 'layout@studio.com',
          assignedTo: 'animator@studio.com',
        },
      },
      closeup: {
        summary: 'Shot closeup con metadatos',
        description: 'Ejemplo de un shot de primer plano con información técnica',
        value: {
          code: 'SH002',
          name: 'Character Reaction',
          description: 'Primer plano de la reacción del personaje principal',
          sequenceNumber: 5,
          sequenceId: '24208f1a-fb40-4d02-ae11-38acfcdb1054',
          status: 'in_progress',
          shotType: 'closeup',
          duration: 90,
          cutOrder: 3,
          createdBy: 'director@studio.com',
          assignedTo: 'senior-animator@studio.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Shot creado exitosamente. El sistema genera automáticamente el código final del shot y asigna metadatos adicionales.',
    type: Shot,
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        code: 'RAT_EP001_B001_S003',
        name: 'Establishing Shot',
        description: 'Plano general que establece la ubicación principal de la escena',
        sequenceNumber: 1,
        status: 'waiting',
        shotType: 'establishing',
        duration: 120,
        cutOrder: 1,
        createdBy: 'layout@studio.com',
        assignedTo: 'animator@studio.com',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        sequenceId: '24208f1a-fb40-4d02-ae11-38acfcdb1054',
        sequence: {
          id: '24208f1a-fb40-4d02-ae11-38acfcdb1054',
          code: 'RAT_EP001_B001',
          name: 'Wake Up Scene',
        },
        versions: [],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o secuencia no encontrada',
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
            'sequenceNumber must be a positive number',
          ],
        },
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
        message: {
          type: 'string',
          example: 'Sequence with ID 24208f1a-fb40-4d02-ae11-38acfcdb1054 not found',
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
  create(@Body() createShotDto: CreateShotDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.shotsService.create(createShotDto, userContext);
  }

  @Get()
  @RequirePermissions(Permission.SHOT_READ)
  @ApiOperation({
    summary: 'Obtener todos los shots con filtros opcionales',
    description: `
    Recupera una lista de shots registrados en el sistema con capacidad de filtrado avanzado.

    **Filtros disponibles:**
    - **status**: Filtro exacto por estado del shot
    - **shotType**: Filtro exacto por tipo de shot
    - **sequenceId**: Filtro exacto por ID de la secuencia (legacy - usar sequence.id)
    - **cutOrder**: Filtro exacto por orden de corte
    - **sequenceNumber**: Filtro exacto por número de secuencia
    - **createdBy**: Búsqueda parcial en usuario creador (no sensible a mayúsculas)
    - **assignedTo**: Búsqueda parcial en usuario asignado (no sensible a mayúsculas)

    **Características:**
    - Todos los filtros son opcionales
    - Se pueden combinar múltiples filtros
    - Las búsquedas de texto son parciales (contienen el término)
    - Sin filtros devuelve todos los shots ordenados por secuencia y orden de corte

    **Ejemplos de uso:**
    - \`GET /shots\` - Todos los shots
    - \`GET /shots?status=in_progress\` - Solo shots en progreso
    - \`GET /shots?sequenceId=550e8400-e29b-41d4-a716-446655440001\` - Shots de una secuencia específica (legacy)
    - \`GET /shots?shotType=closeup&status=final\` - Shots de primer plano finalizados
    `,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filtrar shots por código de estado exacto. Los valores dependen de los status configurados en el sistema.',
    example: 'in_progress',
    schema: {
      type: 'string',
    },
  })
  @ApiQuery({
    name: 'shotType',
    required: false,
    enum: ['establishing', 'medium', 'closeup', 'detail'],
    description: 'Filtrar shots por tipo exacto. Valores: establishing, medium, closeup, detail',
    example: 'closeup',
    schema: {
      type: 'string',
      enum: ['establishing', 'medium', 'closeup', 'detail'],
    },
  })
  @ApiQuery({
    name: 'sequenceId',
    required: false,
    type: 'string',
    description: 'Filtrar shots por ID de la secuencia a la que pertenecen usando filtro exacto',
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
    description: 'Filtrar shots por orden de corte específico (número exacto)',
    example: 1,
    schema: {
      type: 'number',
      minimum: 1,
    },
  })
  @ApiQuery({
    name: 'sequenceNumber',
    required: false,
    type: 'number',
    description: 'Filtrar shots por número de secuencia específico (número exacto)',
    example: 5,
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
      'Filtrar shots por usuario que los creó usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'layout@studio.com',
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
      'Filtrar shots por usuario asignado usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
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
      'Lista de shots obtenida exitosamente. La respuesta incluye todos los shots que coinciden con los filtros aplicados, ordenados por número de secuencia y orden de corte',
    type: [Shot],
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
  findAll(@Query() filters: FilterShotsDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.shotsService.findAll(filters, userContext);
  }

  @Get(':id')
  @RequirePermissions(Permission.SHOT_READ)
  @ApiOperation({
    summary: 'Obtener shot por ID',
    description: `
    Recupera un shot específico utilizando su identificador único (integer), incluyendo todas las relaciones con secuencia y versiones asociadas.

    **Información incluida:**
    - Datos básicos del shot (nombre, descripción, estado, tipo)
    - Metadatos técnicos (duración, orden de corte, número de secuencia)
    - Información de asignación (creador, responsable)
    - Relación con la secuencia padre
    - Lista de todas las versiones del shot
    - Timestamps de creación y actualización

    **Casos de uso:**
    - Visualización detallada de un shot específico
    - Obtener información para edición o actualización
    - Revisar el historial de versiones
    - Verificar el estado actual en el pipeline

    **Nota:** La relación con la secuencia se accede a través de \`sequence.id\` y \`sequence.code\`.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del shot (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Shot encontrado exitosamente con toda la información relacionada',
    type: Shot,
    schema: {
      example: {
        id: 123,
        code: 'RAT_EP001_B001_S001',
        name: 'Establishing Shot',
        description: 'Plano general que establece la ubicación principal de la escena',
        sequenceNumber: 1,
        status: 'final',
        shotType: 'establishing',
        duration: 120,
        cutOrder: 1,
        createdBy: 'layout@studio.com',
        assignedTo: 'animator@studio.com',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T14:45:00Z',
        sequenceId: 456,
        sequence: {
          id: 456,
          code: 'RAT_EP001_B001',
          name: 'Wake Up Scene',
          description: 'Ratoncito despierta en su madriguera al amanecer',
          cutOrder: 1,
          status: 'approved',
        },
        versions: [],
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
        message: { type: 'string', example: 'Invalid shot ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Shot no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Shot with ID 999 not found',
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
        message: { type: 'string', example: 'Error al obtener el shot' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.shotsService.findOneById(id, userContext);
  }

  @Patch(':id')
  @UserRateLimit({ limit: 200, ttl: 60000 })
  @RequirePermissions(Permission.SHOT_UPDATE)
  @ApiOperation({
    summary: 'Actualizar un shot existente',
    description: `
    Actualiza parcial o completamente los datos de un shot existente. Permite modificar cualquier campo del shot sin afectar las versiones asociadas.

    **Campos actualizables:**
    - \`code\`: Código único del shot
    - \`name\`: Nombre descriptivo
    - \`description\`: Descripción detallada
    - \`sequenceNumber\`: Número de orden en la secuencia
    - \`status\`: Estado actual (wtg, ip, rev, app, fin)
    - \`shotType\`: Tipo de shot (establishing, medium, closeup, detail)
    - \`duration\`: Duración en frames
    - \`cutOrder\`: Orden en el corte final
    - \`createdBy\`: Usuario creador
    - \`assignedTo\`: Usuario asignado
    - \`sequenceId\`: Cambiar a otra secuencia (integer ID)

    **Casos de uso comunes:**
    - Cambio de estado en el pipeline de producción
    - Reasignación a diferentes artistas
    - Actualización de metadatos técnicos
    - Modificación de orden y timing

    **Nota:** Todos los campos son opcionales en las actualizaciones.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del shot a actualizar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiBody({
    type: UpdateShotDto,
    description: 'Datos a actualizar del shot (campos opcionales)',
    examples: {
      statusUpdate: {
        summary: 'Cambio de estado',
        description: 'Actualizar el estado de un shot durante el pipeline',
        value: {
          status: 'final',
          assignedTo: 'review-team@studio.com',
        },
      },
      reassignment: {
        summary: 'Reasignación de usuario',
        description: 'Cambiar el usuario asignado al shot',
        value: {
          assignedTo: 'senior-animator@studio.com',
          status: 'in_progress',
        },
      },
      technicalUpdate: {
        summary: 'Actualización técnica',
        description: 'Modificar aspectos técnicos del shot',
        value: {
          duration: 180,
          cutOrder: 5,
          shotType: 'medium',
          description: 'Plano medio actualizado con nuevos requerimientos de timing',
        },
      },
      fullUpdate: {
        summary: 'Actualización completa',
        description: 'Ejemplo de actualización de múltiples campos',
        value: {
          name: 'Character Close-up - Revised',
          description: 'Primer plano del personaje con expresión actualizada',
          status: 'review',
          shotType: 'closeup',
          duration: 150,
          cutOrder: 3,
          assignedTo: 'lead-animator@studio.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Shot actualizado exitosamente',
    type: Shot,
    schema: {
      example: {
        id: 123,
        code: 'RAT_EP001_B001_S002',
        name: 'Character Close-up - Revised',
        description: 'Primer plano del personaje con expresión actualizada',
        sequenceNumber: 2,
        status: 'review',
        shotType: 'closeup',
        duration: 150,
        cutOrder: 3,
        createdBy: 'layout@studio.com',
        assignedTo: 'lead-animator@studio.com',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T16:45:00Z',
        sequenceId: 456,
        sequence: {
          id: 456,
          code: 'RAT_EP001_B001',
          name: 'Wake Up Scene',
        },
        versions: [],
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
    description: 'Shot no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Shot with ID 999 not found',
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
        message: { type: 'string', example: 'Error al actualizar el shot' },
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
          example: "Shot with code 'SH001' already exists",
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateShotDto: UpdateShotDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.shotsService.update(id, updateShotDto, userContext);
  }

  @Delete(':id')
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @RequirePermissions(Permission.SHOT_DELETE)
  @ApiOperation({
    summary: 'Eliminar un shot',
    description: 'Elimina permanentemente un shot y todas sus versiones y notas asociadas',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del shot a eliminar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Shot eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Shot eliminado exitosamente' },
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
        message: { type: 'string', example: 'Invalid shot ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Shot no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Shot with ID 999 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    await this.shotsService.remove(id, userContext);
    return { message: 'Shot eliminado exitosamente' };
  }
}
