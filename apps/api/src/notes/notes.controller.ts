import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { File } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { FilterNotesDto } from './dto/filter-notes.dto';
import { Note } from '../entities/note.entity';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions, Permission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserRateLimit } from '../common/guards/user-rate-limit.guard';
import { UserContext } from '../auth/services';

@ApiTags('Notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @RequirePermissions(Permission.NOTE_CREATE)
  @ApiOperation({
    summary: 'Crear una nueva nota',
    description:
      'Crea una nueva nota asociada a una entidad específica (proyecto, episodio, asset, etc.)',
  })
  @ApiResponse({
    status: 201,
    description: 'Nota creada exitosamente',
    type: Note,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  create(@Body() createNoteDto: CreateNoteDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.notesService.create(createNoteDto, userContext);
  }

  @Get()
  @RequirePermissions(Permission.NOTE_READ)
  @ApiOperation({
    summary: 'Obtener todas las notas con filtros opcionales',
    description: `
    Recupera una lista de notas registradas en el sistema con capacidad de filtrado avanzado.

    **Filtros disponibles:**
    - **linkId**: Filtro exacto por ID de la entidad vinculada
    - **linkType**: Filtro exacto por tipo de entidad vinculada
    - **isRead**: Filtro exacto por estado de lectura
    - **createdBy**: Búsqueda parcial en usuario creador (no sensible a mayúsculas)
    - **assignedTo**: Búsqueda parcial en usuario asignado (no sensible a mayúsculas)
    - **subject**: Búsqueda parcial en asunto (no sensible a mayúsculas)
    - **content**: Búsqueda parcial en contenido (no sensible a mayúsculas)
    - **hasAttachments**: Filtro por notas con/sin archivos adjuntos

    **Características:**
    - Todos los filtros son opcionales
    - Se pueden combinar múltiples filtros
    - Las búsquedas de texto son parciales (contienen el término)
    - Sin filtros devuelve todas las notas ordenadas por fecha de creación descendente

    **Ejemplos de uso:**
    - \`GET /notes\` - Todas las notas
    - \`GET /notes?linkId=uuid&linkType=Project\` - Notas de un proyecto específico
    - \`GET /notes?isRead=false\` - Notas no leídas
    - \`GET /notes?subject=animación&hasAttachments=true\` - Notas sobre animación con archivos adjuntos
    `,
  })
  @ApiQuery({
    name: 'linkId',
    required: false,
    type: 'string',
    description: 'Filtrar notas por ID de la entidad vinculada usando filtro exacto',
    example: '987e6543-e21b-12d3-a456-426614174000',
    schema: {
      type: 'string',
      format: 'uuid',
    },
  })
  @ApiQuery({
    name: 'linkType',
    required: false,
    enum: ['Project', 'Episode', 'Asset', 'Sequence', 'Version'],
    description: 'Filtrar notas por tipo de entidad vinculada usando filtro exacto',
    example: 'Project',
    schema: {
      type: 'string',
      enum: ['Project', 'Episode', 'Asset', 'Sequence', 'Version'],
    },
  })
  @ApiQuery({
    name: 'isRead',
    required: false,
    type: 'boolean',
    description: 'Filtrar notas por estado de lectura',
    example: false,
    schema: {
      type: 'boolean',
    },
  })
  @ApiQuery({
    name: 'createdBy',
    required: false,
    type: 'string',
    description:
      'Filtrar notas por usuario creador usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'supervisor@studio.com',
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
      'Filtrar notas por usuario asignado usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'animator@studio.com',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
    },
  })
  @ApiQuery({
    name: 'subject',
    required: false,
    type: 'string',
    description:
      'Filtrar notas por asunto usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'animación',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
    },
  })
  @ApiQuery({
    name: 'content',
    required: false,
    type: 'string',
    description:
      'Filtrar notas por contenido usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'frames',
    schema: {
      type: 'string',
      minLength: 1,
    },
  })
  @ApiQuery({
    name: 'hasAttachments',
    required: false,
    type: 'boolean',
    description: 'Filtrar notas que tienen o no archivos adjuntos',
    example: true,
    schema: {
      type: 'boolean',
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de notas obtenida exitosamente. La respuesta incluye todas las notas que coinciden con los filtros aplicados, ordenadas por fecha de creación descendente',
    type: [Note],
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
          example: [],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  findAll(@Query() filters: FilterNotesDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.notesService.findAll(filters, userContext);
  }

  @Get(':id')
  @RequirePermissions(Permission.NOTE_READ)
  @ApiOperation({
    summary: 'Obtener una nota por ID',
    description: 'Retorna los detalles completos de una nota específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la nota',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Nota encontrada',
    type: Note,
  })
  @ApiResponse({
    status: 404,
    description: 'Nota no encontrada',
  })
  findOne(@Param('id') id: string, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.notesService.findOne(id, userContext);
  }

  @Patch(':id')
  @UserRateLimit({ limit: 200, ttl: 60000 })
  @RequirePermissions(Permission.NOTE_UPDATE)
  @ApiOperation({
    summary: 'Actualizar una nota',
    description: 'Actualiza parcialmente los datos de una nota existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la nota a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Nota actualizada exitosamente',
    type: Note,
  })
  @ApiResponse({
    status: 404,
    description: 'Nota no encontrada',
  })
  update(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.notesService.update(id, updateNoteDto, userContext);
  }

  @Delete(':id')
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @RequirePermissions(Permission.NOTE_DELETE)
  @ApiOperation({
    summary: 'Eliminar una nota',
    description: 'Elimina permanentemente una nota y todos sus archivos adjuntos asociados',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la nota a eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Nota eliminada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Nota eliminada exitosamente' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Nota no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Note with ID 123e4567-e89b-12d3-a456-426614174000 not found',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async remove(@Param('id') id: string, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    await this.notesService.remove(id, userContext);
    return { message: 'Nota eliminada exitosamente' };
  }

  @Post(':id/attachments')
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiOperation({
    summary: 'Subir archivo adjunto a una nota',
    description:
      'Permite subir un archivo adjunto (imagen, documento, etc.) y asociarlo a una nota existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la nota',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        attachment: {
          type: 'string',
          format: 'binary',
          description: 'Archivo a subir (imagen, PDF, documento, etc.)',
        },
      },
      required: ['attachment'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo adjunto subido exitosamente',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL del archivo subido',
        },
        fileName: {
          type: 'string',
          description: 'Nombre del archivo',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No se proporcionó archivo o formato inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'Nota no encontrada',
  })
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: File,
    @CurrentUser() currentUser?: User,
  ) {
    if (!file) {
      throw new BadRequestException('No attachment file provided');
    }
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    // Verify access before upload
    await this.notesService.findOne(id, userContext);
    return this.notesService.uploadAttachment(id, file);
  }

  @Delete(':id/attachments/:attachmentId')
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @RequirePermissions(Permission.NOTE_DELETE)
  @ApiOperation({
    summary: 'Eliminar archivo adjunto de una nota',
    description: 'Elimina un archivo adjunto específico de una nota',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la nota',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'attachmentId',
    description: 'ID del archivo adjunto a eliminar',
    example: 'attachment-456',
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo adjunto eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Nota o archivo adjunto no encontrado',
  })
  async removeAttachment(@Param('id') id: string, @Param('attachmentId') attachmentId: string) {
    return this.notesService.removeAttachment(id, attachmentId);
  }
}
