import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FilterAssetsDto } from './dto/filter-assets.dto';
import { Asset } from '../entities/asset.entity';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions, Permission } from '../auth/decorators/permissions.decorator';
import { UserRateLimit } from '../common/guards/user-rate-limit.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserContext } from '../auth/services/project-access.service';

@ApiTags('Assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @RequirePermissions(Permission.ASSET_CREATE)
  @ApiOperation({
    summary: 'Crear un nuevo asset',
    description: `
Crea un nuevo asset de producción (recursos reutilizables) asociado a un proyecto específico. Los assets representan elementos de producción que se reutilizan a lo largo del proyecto.

**Concepto de Asset:**
Un asset es un recurso de producción reutilizable que puede aparecer en múltiples shots, sequences o episodios. Ejemplos: personajes, imágenes, archivos de audio, subtítulos, scripts, videos, documentos de texto.

**Tipos de Assets Soportados:**
- \`character\`: Personajes principales y secundarios (modelos 3D, concept art, rigs, avatares)
- \`subtitles\`: Archivos de subtítulos y traducciones (SRT, VTT, TXT)
- \`imagen\`: Imágenes y gráficos (concept art, texturas, referencias visuales, PNG, JPG, WEBP)
- \`audio\`: Archivos de audio (música, efectos de sonido, diálogos, MP3, WAV, OGG)
- \`script\`: Scripts y documentos de producción (guiones, documentos técnicos, PDF, DOCX)
- \`text\`: Archivos de texto plano (notas, prompts, metadatos, TXT, MD, JSON)
- \`video\`: Archivos de video (demos de personajes, animaciones de props, referencias, MP4, MOV)

**Campos Requeridos:**
- \`code\`: Código único identificador del asset (ej: "CHAR_HERO", "PROP_SWORD")
  - Debe ser único dentro del proyecto
  - Convención: Prefijo del tipo + nombre descriptivo
- \`name\`: Nombre descriptivo del asset (ej: "Personaje Principal", "Espada Mágica")
- \`assetType\`: Tipo de asset (enum: character, subtitles, imagen, audio, script, text, video)
- \`projectId\`: ID UUID del proyecto al que pertenece (debe existir)

**Campos Opcionales:**
- \`description\`: Descripción detallada del asset y su propósito
- \`statusId\`: ID del estado en el workflow (waiting, in_progress, review, approved)
- \`thumbnailPath\`: URL de la imagen thumbnail para preview
- \`versionId\`: ID de la versión actual del asset (se asocia automáticamente al crear versiones)
- \`createdBy\`: ID del usuario que crea el asset
- \`assignedTo\`: ID del usuario asignado para trabajar en el asset

**Relación con Versiones:**
Los assets pueden tener múltiples versiones asociadas mediante el sistema de versiones:
- Cada versión representa una iteración del asset (ej: concept v1, v2, v3)
- Las versiones pueden contener videos, imágenes o texto
- Solo una versión puede estar marcada como \`latest=true\`
- Se crean versiones usando \`POST /versions\` con \`entityType="asset"\` y \`entityCode\` del asset

**Workflow Típico:**
1. Crear asset con \`POST /assets\`
2. Crear versiones del asset con \`POST /versions\` o \`POST /versions/asset\`
3. Subir archivos (concept art, videos, texturas) con \`POST /versions/:id/file\`
4. Actualizar estado durante revisión y aprobación

**Notas para IA:**
- El \`code\` debe seguir convenciones del proyecto para facilitar búsqueda
- \`versionId\` se actualiza automáticamente cuando se crea una nueva versión marcada como latest
- \`thumbnailPath\` es opcional pero recomendado para mejor UX en grids
- Los assets se filtran por \`projectId\` para mantener organización por proyecto
    `,
  })
  @ApiBody({
    type: CreateAssetDto,
    description: 'Datos necesarios para crear un nuevo asset',
    examples: {
      character: {
        summary: 'Asset de personaje',
        description: 'Ejemplo de creación de un asset de personaje principal',
        value: {
          code: 'CHAR_HERO',
          name: 'Personaje Principal',
          assetType: 'character',
          description: 'Modelo 3D del protagonista con rig completo para animación',
          statusId: '123e4567-e89b-12d3-a456-426614174000',
          projectId: 123,
          createdBy: 'character-designer@studio.com',
          assignedTo: 'modeler@studio.com',
        },
      },
      imagen: {
        summary: 'Asset de imagen',
        description: 'Ejemplo de creación de un asset de imagen (concept art, textura)',
        value: {
          code: 'IMG_CONCEPT_01',
          name: 'Concept Art - Bosque',
          assetType: 'imagen',
          description: 'Concept art del bosque encantado para referencia visual',
          statusId: '223e4567-e89b-12d3-a456-426614174000',
          projectId: 123,
          thumbnailPath: '/uploads/thumbnails/forest_concept.jpg',
          createdBy: 'concept-artist@studio.com',
          assignedTo: 'environment-designer@studio.com',
        },
      },
      audio: {
        summary: 'Asset de audio',
        description: 'Ejemplo de creación de un asset de audio (música, efectos)',
        value: {
          code: 'AUD_MUSIC_01',
          name: 'Música de Fondo - Bosque',
          assetType: 'audio',
          description: 'Música ambiental para la secuencia del bosque',
          statusId: '323e4567-e89b-12d3-a456-426614174000',
          projectId: 123,
          createdBy: 'composer@studio.com',
          assignedTo: 'sound-designer@studio.com',
        },
      },
      subtitles: {
        summary: 'Asset de subtítulos',
        description: 'Ejemplo de creación de un asset de subtítulos',
        value: {
          code: 'SUB_ES_01',
          name: 'Subtítulos Español - Episodio 1',
          assetType: 'subtitles',
          description: 'Archivo de subtítulos en español para el episodio 1',
          statusId: '423e4567-e89b-12d3-a456-426614174000',
          projectId: 123,
          createdBy: 'translator@studio.com',
          assignedTo: 'editor@studio.com',
        },
      },
      script: {
        summary: 'Asset de script',
        description: 'Ejemplo de creación de un asset de script/guion',
        value: {
          code: 'SCRIPT_EP01',
          name: 'Script Episodio 1',
          assetType: 'script',
          description: 'Guion completo del episodio 1 con diálogos y acotaciones',
          statusId: '523e4567-e89b-12d3-a456-426614174000',
          projectId: 123,
          createdBy: 'writer@studio.com',
          assignedTo: 'director@studio.com',
        },
      },
      video: {
        summary: 'Asset de video',
        description: 'Ejemplo de creación de un asset de video (demo, referencia)',
        value: {
          code: 'VID_DEMO_01',
          name: 'Demo Personaje - Animación',
          assetType: 'video',
          description: 'Video demo del personaje principal con animaciones de prueba',
          statusId: '623e4567-e89b-12d3-a456-426614174000',
          projectId: 123,
          createdBy: 'animator@studio.com',
          assignedTo: 'director@studio.com',
        },
      },
      text: {
        summary: 'Asset de texto',
        description: 'Ejemplo de creación de un asset de texto (notas, prompts)',
        value: {
          code: 'TXT_NOTES_01',
          name: 'Notas de Producción',
          assetType: 'text',
          description: 'Notas y observaciones de producción en formato texto',
          statusId: '723e4567-e89b-12d3-a456-426614174000',
          projectId: 123,
          createdBy: 'producer@studio.com',
          assignedTo: 'director@studio.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Asset creado exitosamente con todas las relaciones establecidas',
    type: Asset,
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        code: 'CHAR',
        name: 'Personaje Principal',
        assetType: 'character',
        status: 'waiting',
        description: 'Modelo 3D del protagonista con rig completo para animación',
        thumbnailPath: null,
        createdBy: 'character-designer@studio.com',
        assignedTo: 'modeler@studio.com',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        projectId: 'b899d424-0d20-451d-af78-e965d0d6d717',
        versionId: null,
        project: {
          id: 'b899d424-0d20-451d-af78-e965d0d6d717',
          code: 'RAT',
          name: 'El Ratoncito Valiente',
        },
        version: null,
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
            'assetType must be a valid enum value',
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
  create(@Body() createAssetDto: CreateAssetDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.assetsService.create(createAssetDto, userContext);
  }

  @Get()
  @RequirePermissions(Permission.ASSET_READ)
  @ApiOperation({
    summary: 'Obtener todos los assets con filtros opcionales',
    description: `
    Recupera una lista de assets registrados en el sistema con capacidad de filtrado avanzado.

    **Filtros disponibles:**
    - **status**: Filtro exacto por estado del asset
    - **assetType**: Filtro exacto por tipo de asset
    - **projectId**: Filtro exacto por ID del proyecto
    - **versionId**: Filtro exacto por ID de la versión
    - **createdBy**: Búsqueda parcial en usuario creador (no sensible a mayúsculas)
    - **assignedTo**: Búsqueda parcial en usuario asignado (no sensible a mayúsculas)

    **Características:**
    - Todos los filtros son opcionales
    - Se pueden combinar múltiples filtros
    - Las búsquedas de texto son parciales (contienen el término)
    - Sin filtros devuelve todos los assets ordenados por tipo, nombre y fecha

    **Ejemplos de uso:**
    - \`GET /assets\` - Todos los assets
    - \`GET /assets?status=in_progress\` - Solo assets en progreso
    - \`GET /assets?assetType=character&projectId=123\` - Personajes de un proyecto específico
    - \`GET /assets?status=approved&assetType=imagen\` - Imágenes aprobadas
    - \`GET /assets?assetType=audio&projectId=123\` - Assets de audio de un proyecto
    - \`GET /assets?assetType=subtitles\` - Todos los assets de subtítulos
    `,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filtrar assets por código de estado exacto. Los valores dependen de los status configurados en el sistema.',
    example: 'in_progress',
    schema: {
      type: 'string',
    },
  })
  @ApiQuery({
    name: 'assetType',
    required: false,
    enum: ['character', 'subtitles', 'imagen', 'audio', 'script', 'text', 'video'],
    description:
      'Filtrar assets por tipo exacto. Valores: character (personajes), subtitles (subtítulos), imagen (imágenes), audio (archivos de audio), script (guiones), text (texto plano), video (videos)',
    example: 'character',
    schema: {
      type: 'string',
      enum: ['character', 'subtitles', 'imagen', 'audio', 'script', 'text', 'video'],
    },
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: 'string',
    description: 'Filtrar assets por ID del proyecto al que pertenecen usando filtro exacto',
    example: 'b899d424-0d20-451d-af78-e965d0d6d717',
    schema: {
      type: 'string',
      format: 'uuid',
    },
  })
  @ApiQuery({
    name: 'versionId',
    required: false,
    type: 'string',
    description: 'Filtrar assets por ID de la versión asociada usando filtro exacto',
    example: '75fbbe15-d89b-4684-8e28-b91ec4ebef07',
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
      'Filtrar assets por usuario que los creó usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'modeler@studio.com',
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
      'Filtrar assets por usuario asignado usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
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
      'Lista de assets obtenida exitosamente. La respuesta incluye todos los assets que coinciden con los filtros aplicados, ordenados por tipo, nombre y fecha de creación',
    type: [Asset],
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
  findAll(@Query() filters: FilterAssetsDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.assetsService.findAll(filters, userContext);
  }

  @Get(':id')
  @RequirePermissions(Permission.ASSET_READ)
  @ApiOperation({
    summary: 'Obtener asset por ID',
    description: 'Recupera un asset específico utilizando su ID único (integer)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del asset (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Asset encontrado exitosamente',
    type: Asset,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de asset inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid asset ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Asset no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Asset with ID 999 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.assetsService.findOneById(id, userContext);
  }

  @Patch(':id')
  @UserRateLimit({ limit: 200, ttl: 60000 })
  @RequirePermissions(Permission.ASSET_UPDATE)
  @ApiOperation({
    summary: 'Actualizar asset existente',
    description: 'Actualiza parcial o completamente los datos de un asset existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del asset a actualizar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiBody({
    type: UpdateAssetDto,
    description: 'Datos a actualizar del asset (campos opcionales)',
  })
  @ApiResponse({
    status: 200,
    description: 'Asset actualizado exitosamente',
    type: Asset,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de asset inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid asset ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Asset no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Asset with ID 999 not found' },
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
          example: "Asset with code 'CHAR' already exists",
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAssetDto: UpdateAssetDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.assetsService.update(id, updateAssetDto, userContext);
  }

  @Delete(':id')
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @RequirePermissions(Permission.ASSET_DELETE)
  @ApiOperation({
    summary: 'Eliminar asset',
    description: 'Elimina permanentemente un asset del sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del asset a eliminar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Asset eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Asset eliminado exitosamente' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID de asset inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid asset ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Asset no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Asset with ID 999 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    await this.assetsService.remove(id, userContext);
    return { message: 'Asset eliminado exitosamente' };
  }

  @Post(':id/thumbnail')
  @HttpCode(200)
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiOperation({
    summary: 'Subir thumbnail para asset',
    description:
      'Permite subir una imagen en miniatura para un asset específico. Acepta tanto ID numérico como código del asset.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del asset (integer) o código único del asset (string)',
    example: '123 o SUBS-ES',
    type: 'string',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen para el thumbnail del asset',
        },
      },
      required: ['thumbnail'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail subido exitosamente',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL del thumbnail subido',
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
    description: 'No se proporcionó archivo o parámetro inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'Asset no encontrado',
  })
  async uploadThumbnail(
    @Param('id') idOrCode: string,
    @UploadedFile() file: any,
    @CurrentUser() currentUser?: User,
  ) {
    if (!file) {
      throw new BadRequestException('No thumbnail file provided');
    }
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;

    // Check if idOrCode is numeric (ID) or string (code)
    const numericId = Number.parseInt(idOrCode, 10);
    if (!Number.isNaN(numericId) && numericId > 0 && idOrCode === String(numericId)) {
      // It's a valid numeric ID
      return this.assetsService.uploadThumbnail(numericId, file, userContext);
    } else {
      // It's a code
      return this.assetsService.uploadThumbnailByCode(idOrCode, file, userContext);
    }
  }
}
