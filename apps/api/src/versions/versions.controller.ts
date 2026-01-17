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
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { MultipartFormDataInterceptor } from '../common/interceptors/multipart-form-data.interceptor';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VersionsService } from './versions.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { CreateAssetWithVersionDto } from './dto/create-asset-with-version.dto';
import { CreateSequenceWithVersionDto } from './dto/create-sequence-with-version.dto';
import { Version } from '../entities/version.entity';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions, Permission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserContext } from '../auth/services';
import { UserRateLimit } from '../common/guards/user-rate-limit.guard';

@ApiTags('Versions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@Controller('versions')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Post()
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @RequirePermissions(Permission.VERSION_CREATE)
  @ApiOperation({
    summary: 'Crear una nueva versión multientidad',
    description: `
Crea una nueva versión asociada a cualquier tipo de entidad del sistema. Las versiones representan iteraciones de contenido (imágenes, texto) asociadas a entidades de producción.

**Sistema Multientidad:**
Las versiones utilizan \`entityCode\` (código único de la entidad) y \`entityType\` (tipo de entidad) para asociarse polimórficamente a cualquier entidad:
- \`asset\`: Recursos reutilizables (personajes, imágenes, audio, subtítulos, scripts, texto)
- \`project\`: Versiones asociadas directamente al proyecto (ej: guiones, notas generales)
- \`sequence\`: Secuencias de planos relacionados
- \`episode\`: Episodios completos de una serie

**Proceso de Creación:**
1. Validación: Se verifica que \`entityCode\` y \`entityType\` sean válidos y que la entidad exista
2. Vinculación: La versión se asocia a la entidad mediante \`entityCode\` y \`entityType\`
3. Versionado: Se calcula automáticamente \`versionNumber\` basado en versiones existentes
4. Estado: Se establece \`latest=true\` y se marca \`latest=false\` en versiones anteriores
5. Archivos: Se pueden incluir \`filePath\` (archivo principal) y \`thumbnailPath\` (miniatura)
6. Metadatos IA: Campos \`lineage\` (JSON) para almacenar prompt, seed, model_name de generación IA

**Tipos de Contenido:**
- Imágenes: Archivos de imagen (PNG, JPG, WEBP) para concept art, storyboards, frames
- Texto: Archivos de texto (TXT, MD, JSON) para prompts, notas, metadatos

**Workflow de Aprobación:**
Las versiones siguen un flujo de estados definido por \`statusId\`:
- Estados iniciales: \`wip\` (work in progress), \`review\` (en revisión)
- Estados finales: \`approved\` (aprobado), \`rejected\` (rechazado)
- El campo \`assignedTo\` indica quién debe revisar la versión

- **Assets**: Versiones de concept art (Midjourney, DALL-E), texturas
- **Sequences**: Versiones de layouts, storyboards estáticos

**Notas para IA:**
- El campo \`code\` debe ser único y seguir convención: \`{ENTITY_CODE}_{VERSION_NUMBER}\`
- \`filePath\` puede ser una URL completa o ruta relativa; se valida al subir archivo
- \`lineage\` es un JSON string que contiene metadatos de generación IA
- \`latest\` se actualiza automáticamente: solo una versión por entidad puede ser \`latest=true\`
- \`publishedAt\` indica cuándo la versión fue publicada/aprobada para uso en producción
    `,
  })
  @ApiBody({
    type: CreateVersionDto,
    description:
      'Datos necesarios para crear una nueva versión. Usa `entityCode` y `entityType` para asociar a cualquier entidad.',
    examples: {
      asset_version: {
        summary: 'Versión de Asset (Personaje IA)',
        description: 'Ejemplo de creación de versión para un asset generado con IA',
        value: {
          entityCode: 'CHAR_HERO',
          entityType: 'asset',
          code: 'CHAR_HERO_002',
          name: 'Ratoncito Valiente - Concept v2',
          description:
            'Concept art del personaje principal generado con Midjourney. Segunda iteración con ajustes de vestuario',
          status: 'approved',
          format: 'PNG',
          artist: 'AI Art Director',
          createdBy: 'concept-artist@studio.com',
          assignedTo: 'director@studio.com',
          latest: true,
        },
      },
      sequence_version: {
        summary: 'Versión de Sequence',
        description: 'Ejemplo de creación de versión para una sequence',
        value: {
          entityCode: 'SEQ_FOREST',
          entityType: 'sequence',
          code: 'SEQ_FOREST_001',
          name: 'Escena del Bosque - Previz IA',
          description: 'Previz generado con IA de la secuencia del bosque encantado',
          status: 'review',
          createdBy: 'ai-operator@studio.com',
          assignedTo: 'director@studio.com',
          latest: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Versión creada exitosamente',
    type: Version,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  create(@Body() createVersionDto: CreateVersionDto, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.versionsService.create(createVersionDto, userContext);
  }

  @Post('asset')
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @UseInterceptors(AnyFilesInterceptor(), MultipartFormDataInterceptor)
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Crear asset con versión personalizada',
    description:
      'Crea un nuevo asset y su versión asociada en una sola transacción. Permite especificar datos personalizados para ambos. Soporta tanto JSON como multipart/form-data.',
  })
  @ApiBody({
    type: CreateAssetWithVersionDto,
    description:
      'Datos del asset y versión a crear. Puede enviarse como JSON o multipart/form-data.',
    examples: {
      basic: {
        summary: 'Creación básica',
        description: 'Crear asset con versión básica',
        value: {
          name: 'Nuevo Asset',
          assetType: 'character',
          projectId: 'aac81fe1-5ef7-466b-9c49-6537b477c0fe',
          versionCode: 'CUSTOM_ASSET_001',
          versionName: 'Versión personalizada',
          versionDescription: 'Versión con datos específicos',
          versionStatus: 'review',
          createdBy: 'ai-operator@studio.com',
        },
      },
      complete: {
        summary: 'Creación completa',
        description: 'Crear asset con todos los campos',
        value: {
          name: 'Ratoncito Valiente',
          assetType: 'character',
          projectId: 'aac81fe1-5ef7-466b-9c49-6537b477c0fe',
          code: 'RAT_HERO',
          description: 'Personaje principal generado con IA - ratoncito aventurero',
          status: 'waiting',
          thumbnailPath: '/uploads/thumbnails/rat_hero_concept.jpg',
          createdBy: 'ai-generator@studio.com',
          assignedTo: 'character-designer@studio.com',
          versionCode: 'RAT_HERO_001',
          versionName: 'Concept Art Generado por IA',
          versionDescription:
            'Primera versión del personaje generada con inteligencia artificial usando prompt de diseño',
          versionStatus: 'review',
          filePath: '/uploads/versions/RAT_HERO_001.jpg',
          format: 'JPG',
          frameRange: null,
          artist: 'AI Generator',
          versionCreatedBy: 'ai-generator@studio.com',
          versionAssignedTo: 'character-designer@studio.com',
          versionThumbnailPath: '/uploads/thumbnails/version_rat_hero_001.jpg',
          latest: true,
          publishedAt: '2024-01-15T16:30:00Z',
          lineage: 'v001 -> v002 -> v003',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Asset y versión creados exitosamente',
    schema: {
      type: 'object',
      properties: {
        asset: { $ref: '#/components/schemas/Asset' },
        version: { $ref: '#/components/schemas/Version' },
      },
    },
  })
  createAssetWithVersion(
    @Body() createAssetWithVersionDto: CreateAssetWithVersionDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.versionsService.createAssetWithVersion(createAssetWithVersionDto, userContext);
  }

  @Post('sequence')
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @UseInterceptors(AnyFilesInterceptor(), MultipartFormDataInterceptor)
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Crear sequence con versión personalizada',
    description: `
Crea una nueva sequence y su versión asociada en una sola transacción. Permite especificar datos personalizados para ambos. Soporta tanto JSON como multipart/form-data.

**IMPORTANTE - Tipos de Contenido:**
Las versiones de secuencias contienen imágenes de producción:
- **Imágenes**: Storyboards estáticos, frames clave, layouts de secuencia
- **Formatos**: PNG, JPG, WEBP

El tipo de contenido se determina automáticamente por la extensión del archivo en \`filePath\`. La UI muestra la imagen en el visor correspondiente.

**Proceso de Creación:**
1. Se crea la sequence con los metadatos proporcionados
2. Se asocia al episodio mediante \`episodeId\` o \`episodeCode\`
3. Se crea la versión asociada con \`entityType="sequence"\` y \`entityCode\` de la sequence
4. Se puede incluir \`filePath\` (imagen) y \`thumbnailPath\` en la versión

**Parámetros Clave:**
- \`filePath\`: URL o ruta del archivo principal de imagen
- \`format\`: Formato o dimensiones de la imagen (PNG, JPG, WEBP)
- \`thumbnailPath\`: Thumbnail para preview (recomendado para mejor UX)
- \`versionStatusId\`: Estado inicial de la versión en el workflow

**Notas para IA:**
- El \`filePath\` puede ser una URL completa o ruta relativa
- La aplicación está optimizada para la gestión de storyboards y frames visuales
- Para subir archivo después de crear, usar \`POST /versions/:id/file\`
- El campo \`latest\` se establece automáticamente como \`true\` para la primera versión
- Soporta multipart/form-data para upload directo de archivos durante la creación
    `,
  })
  @ApiBody({
    type: CreateSequenceWithVersionDto,
    description:
      'Datos de la sequence y versión a crear. Puede enviarse como JSON o multipart/form-data.',
    examples: {
      basic: {
        summary: 'Creación básica',
        description: 'Crear sequence con versión básica',
        value: {
          name: 'Nueva Sequence',
          cutOrder: 1,
          episodeCode: 'EP_PILOT',
          versionCode: 'CUSTOM_SEQUENCE_001',
          versionName: 'Versión personalizada',
          versionDescription: 'Versión con datos específicos',
          versionStatus: 'review',
          createdBy: 'storyboard@studio.com',
        },
      },
      complete: {
        summary: 'Creación completa con arte IA',
        description: 'Crear sequence con storyboard generado por IA',
        value: {
          name: 'Escena del Bosque Encantado',
          cutOrder: 1,
          episodeCode: 'EP_PILOT',
          code: 'SEQ_FOREST',
          description: 'Los protagonistas se adentran en el bosque mágico',
          status: 'waiting',
          duration: 120,
          storyId: 'STORY_EP01_001',
          createdBy: 'ai-operator@studio.com',
          assignedTo: 'director@studio.com',
          versionCode: 'SEQ_FOREST_001',
          versionName: 'Storyboard IA - Primera Iteración',
          versionDescription:
            'Storyboard de la secuencia completa generado con IA para establecer composición',
          versionStatus: 'review',
          filePath: '/uploads/versions/SEQ_FOREST_001.png',
          format: 'PNG',
          frameRange: '1-120',
          artist: 'AI Storyboard Generator',
          versionCreatedBy: 'ai-operator@studio.com',
          versionAssignedTo: 'director@studio.com',
          versionThumbnailPath: '/uploads/thumbnails/version_123.jpg',
          latest: true,
          publishedAt: '2024-01-15T16:30:00Z',
          lineage: 'prompt: "character entering magical forest, cinematic lighting, ghibli style"',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Sequence y versión creados exitosamente',
    schema: {
      type: 'object',
      properties: {
        sequence: { $ref: '#/components/schemas/Sequence' },
        version: { $ref: '#/components/schemas/Version' },
      },
    },
  })
  createSequenceWithVersion(
    @Body() createSequenceWithVersionDto: CreateSequenceWithVersionDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.versionsService.createSequenceWithVersion(
      createSequenceWithVersionDto,
      userContext,
    );
  }

  @Get('test')
  @ApiOperation({
    summary: 'Endpoint de prueba',
    description:
      'Endpoint utilizado para verificar que el servicio de versiones está funcionando correctamente',
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta de prueba exitosa',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Versions endpoint is working' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  test() {
    return {
      message: 'Versions endpoint is working',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('simple')
  @ApiOperation({
    summary: 'Obtener versiones (modo simple)',
    description:
      'Endpoint de depuración que retorna todas las versiones con información adicional de conteo y manejo de errores',
  })
  @ApiResponse({
    status: 200,
    description: 'Versiones obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Número total de versiones' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Version' },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno con información de depuración',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        stack: { type: 'string' },
      },
    },
  })
  async simple(@CurrentUser() currentUser?: User) {
    try {
      const userContext: UserContext | undefined = currentUser
        ? { userId: currentUser.id, role: currentUser.role }
        : undefined;
      // Query directo a la base de datos sin TypeORM
      const result = await this.versionsService.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        userContext,
      );
      return { count: result.length, data: result };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { error: err.message, stack: err.stack };
    }
  }

  @Get()
  @RequirePermissions(Permission.VERSION_READ)
  @ApiOperation({
    summary: 'Listar versiones con filtros multientidad',
    description: `
Recupera versiones del sistema con capacidad de filtrado avanzado por entidad asociada. Soporta filtros legacy y nuevos filtros polimórficos.

**Sistema de Filtrado:**

**Filtros Legacy (por compatibilidad):**
- \`assetId\`: Código del asset (ej: "CHAR_HERO") - filtra versiones de ese asset
- \`sequenceId\`: Código de la sequence (ej: "SEQ_FOREST") - filtra versiones de esa sequence

**Filtros Nuevos (recomendados):**
- \`entityCode\`: Código de cualquier entidad (asset, sequence, episode)
- \`entityType\`: Tipo de entidad ("asset", "sequence", "episode")
- \`entityId\`: ID numérico de la entidad (para entidades migradas)
- \`latest\`: Boolean ("true"/"false") - filtra solo versiones marcadas como latest

**Comportamiento:**
- Sin filtros: Retorna TODAS las versiones del sistema (puede ser lento en sistemas grandes)
- Con filtros: Filtrado eficiente usando índices de base de datos
- Se recomienda usar \`entityCode\` + \`latest=true\` para obtener la versión actual de cada entidad
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de versiones obtenida exitosamente',
    type: [Version],
  })
  findAll(
    @Query('entityCode') entityCode?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('latest') latest?: string,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    // Support new entityCode/entityType/entityId filters
    const latestBool = latest !== undefined ? latest === 'true' || latest === '1' : undefined;
    const entityIdNum = entityId ? parseInt(entityId, 10) : undefined;
    return this.versionsService.findAll(
      entityCode,
      entityType,
      latestBool,
      entityIdNum,
      userContext,
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.VERSION_READ)
  @ApiOperation({
    summary: 'Obtener versión por ID',
    description: `
Recupera los detalles completos de una versión específica mediante su ID único (integer). Este endpoint es el método principal para obtener información detallada de una versión individual.

**Información Retornada:**

**Identificación:**
- \`id\`: ID único numérico de la versión
- \`code\`: Código único de la versión (ej: "ASSET_001_003")
- \`name\`: Nombre descriptivo de la versión
- \`versionNumber\`: Número de versión dentro de la entidad

**Relación con Entidad:**
- \`entityId\`: ID numérico de la entidad asociada (si está migrada)
- \`entityCode\`: Código de la entidad (ej: "ASSET_001", "SEQ_001")
- \`entityType\`: Tipo de entidad ("asset", "sequence", "episode", "project")

**Archivos y Contenido:**
- \`filePath\`: URL pública del archivo principal (imagen o texto)
  - Imágenes: PNG, JPG, WEBP
  - Texto: TXT, MD, JSON
- \`thumbnailPath\`: URL pública del thumbnail (imagen de preview)
- \`format\`: Formato del archivo (ej: "PNG", "16:9")

**Metadatos de Producción:**
- \`description\`: Descripción detallada de cambios/iteraciones
- \`statusId\`: ID del estado en el workflow de aprobación
- \`artist\`: Nombre del artista o sistema generador (ej: "AI Generator", "John Doe")
- \`createdBy\`: ID del usuario que creó la versión
- \`assignedTo\`: ID del usuario asignado para revisión
- \`latest\`: Boolean indicando si es la versión más reciente

**Metadatos de Generación IA:**
- \`lineage\`: JSON string con historial de generación (prompt, seed, model_name)
- \`prompt\`: Prompt usado para generación (si aplica)
- \`seed\`: Seed usado para generación (si aplica)

**Timestamps:**
- \`createdAt\`: Fecha de creación
- \`updatedAt\`: Fecha de última actualización
- \`statusUpdatedAt\`: Fecha de último cambio de estado
- \`publishedAt\`: Fecha de publicación/aprobación (si aplica)

**Uso Típico:**
- Ver detalles completos de una versión en la UI
- Obtener información antes de actualizar (PATCH)
- Verificar existencia y estado de una versión
- Obtener URLs de archivos para visualización
- Acceder a metadatos de generación IA para análisis

**Notas para IA:**
- El \`filePath\` puede ser null si no se ha subido archivo aún
- La aplicación está optimizada para el manejo de imágenes y metadatos JSON
- \`latest=true\` significa que es la versión actual de esa entidad
- \`lineage\` contiene metadatos estructurados en formato JSON string
- Los timestamps están en formato ISO 8601
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la versión (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Versión encontrada con todos sus datos',
    type: Version,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid version ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Versión no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Version with ID 999 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.versionsService.findOneById(id, userContext);
  }

  @Patch(':id')
  @UserRateLimit({ limit: 200, ttl: 60000 })
  @RequirePermissions(Permission.VERSION_UPDATE)
  @ApiOperation({
    summary: 'Actualizar metadatos de versión',
    description: `
Actualiza parcial o completamente los datos de una versión existente.

**Campos Actualizables:**
- \`name\`: Nombre descriptivo
- \`description\`: Descripción detallada
- \`status\`: Estado en workflow (wip, review, approved, rejected)
- \`artist\`: Artista responsable
- \`assignedTo\`: Usuario asignado para revisión
- \`format\`: Formato o dimensiones de la imagen (PNG, JPG, etc.)
- \`latest\`: Marca si es la versión más reciente
- Y otros metadatos

**Uso Común:**
- Cambiar status durante workflow de aprobación
- Actualizar descripción con notas de cambios
- Reasignar a diferente revisor
- Marcar como versión latest/no-latest

**Nota:** Para archivos (thumbnail, render visual), usar los endpoints específicos de upload.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la versión a actualizar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiBody({
    type: UpdateVersionDto,
    description: 'Datos a actualizar (todos los campos son opcionales)',
  })
  @ApiResponse({
    status: 200,
    description: 'Versión actualizada con los nuevos valores',
    type: Version,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid version ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Versión no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Version with ID 999 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVersionDto: UpdateVersionDto,
    @CurrentUser() currentUser?: User,
  ) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.versionsService.update(id, updateVersionDto, userContext);
  }

  @Delete(':id')
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @RequirePermissions(Permission.VERSION_DELETE)
  @ApiOperation({
    summary: 'Eliminar versión permanentemente',
    description: `
Elimina una versión del sistema de forma permanente.

**⚠️ ADVERTENCIA:**
- Esta operación es irreversible
- Se elimina la versión y todos sus metadatos de la base de datos
- Se eliminan automáticamente los archivos asociados del storage (thumbnail e imagen)
- La entidad asociada (asset, sequence, etc.) NO se ve afectada
- Si la versión eliminada tenía \`latest: true\`, se asigna automáticamente a la versión más reciente

**Proceso de Eliminación:**
1. Busca y valida que la versión existe
2. Elimina el thumbnail del storage (si existe)
3. Elimina el archivo principal del storage (si existe)
4. Elimina el registro de la base de datos
5. Si era la versión latest, actualiza la siguiente versión más reciente

**Consideraciones:**
- Verificar que no está en uso antes de eliminar
- La eliminación de archivos es definitiva (no hay papelera de reciclaje)
- Solo usuarios con permisos adecuados deberían poder ejecutar esto

**Alternativa:**
Considerar marcar como \`status: rejected\` en lugar de eliminar, para mantener historial completo.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la versión a eliminar (integer)',
    example: 123,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Versión eliminada exitosamente del sistema',
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid version ID' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Versión no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Version with ID 999 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser?: User) {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.versionsService.remove(id, userContext);
  }

  @Post(':id/thumbnail')
  @HttpCode(200)
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiOperation({
    summary: 'Subir thumbnail de versión',
    description: `
Sube una imagen thumbnail (miniatura) para una versión específica. El thumbnail es una imagen de vista previa que se muestra en la UI para identificación visual rápida sin necesidad de cargar el archivo completo.

**Proceso de Upload:**
1. El archivo se sube como \`multipart/form-data\` con el campo \`thumbnail\`
2. Validación: Se verifica que sea una imagen válida (JPG, PNG, WebP)
3. Almacenamiento: Se guarda en el bucket de thumbnails (MinIO/S3)
4. Actualización: Se actualiza \`thumbnailPath\` en la versión con la URL pública
5. Respuesta: Se retorna la versión actualizada con el nuevo \`thumbnailPath\`

**Formatos Soportados:**
- JPG/JPEG: Formato estándar, buena compresión
- PNG: Soporte de transparencia, sin pérdida de calidad
- WebP: Formato moderno, mejor compresión que JPG/PNG

**Especificaciones Técnicas:**
- Tamaño máximo de archivo: 5MB
- Dimensiones recomendadas: 640x360 (16:9) o proporcional al contenido
- Dimensiones máximas: 1920x1080 (Full HD)
- Optimización: Se recomienda comprimir antes de subir para mejor rendimiento

**Uso en UI:**
- Grids de versiones: Muestra thumbnail en lugar de cargar imagen completa
- Vista previa rápida: Permite identificar versiones sin descargar contenido
- Navegación visual: Facilita la selección y revisión de versiones
- Fallback: Si no hay thumbnail, la UI muestra un placeholder genérico

**Relación con filePath:**
- \`thumbnailPath\`: Imagen pequeña para preview (este endpoint)
- \`filePath\`: Archivo completo (imagen, texto) - endpoint \`POST /versions/:id/file\`
- Ambos son independientes: una versión puede tener thumbnail sin filePath y viceversa
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la versión (integer)',
    example: 123,
    type: 'number',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen para el thumbnail (JPG, PNG, WebP)',
        },
      },
      required: ['thumbnail'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail subido y versión actualizada',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL pública del thumbnail' },
        fileName: {
          type: 'string',
          description: 'Nombre del archivo guardado',
        },
      },
    },
  })
  async uploadThumbnail(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @CurrentUser() currentUser?: User,
  ) {
    if (!file) {
      throw new BadRequestException('No thumbnail file provided');
    }
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.versionsService.uploadThumbnail(id, file, userContext);
  }

  @Post(':id/file')
  @HttpCode(200)
  @UserRateLimit({ limit: 100, ttl: 60000 })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Subir archivo principal de versión',
    description: `
Sube el archivo principal de trabajo de una versión. Soporta imágenes y archivos de texto.

**Imágenes:**
- Formatos: PNG, JPG, JPEG, WEBP, TIFF, GIF, BMP
- Casos de uso: Concept art, storyboards, frames, layouts de producción

**Archivos de Texto:**
- Formatos: TXT, MD, JSON, XML, CSV
- Casos de uso: Prompts de IA, notas de producción, metadatos estructurados
- Tamaño máximo: 2GB
- Encoding: UTF-8 por defecto

**Proceso de Upload:**
1. El archivo se sube como \`multipart/form-data\` con el campo \`file\`
2. Se valida el tipo MIME y extensión del archivo
3. Se almacena en el sistema de archivos o storage externo (MinIO/S3)
4. Se actualiza \`filePath\` en la versión con la URL pública
5. Se retorna la versión actualizada con el nuevo \`filePath\`

**Tipos de Archivo Según Entidad:**

**Episodes (Episodios):**
- Texto: TXT (guiones, notas de dirección)

**Assets (Recursos):**
- Imágenes (\`assetType=imagen\`): PNG, JPG, WEBP (concept art, texturas, referencias visuales)
- Otros Assets: Pueden tener versiones con imágenes o modelos vinculados

**Sequences (Secuencias):**
- Imágenes: PNG, JPG (storyboards, frames clave)
- Texto: TXT (notas de dirección, timing)

**Consideraciones Técnicas:**
- Storage: Los archivos se almacenan en MinIO/S3 con URLs firmadas temporales
- Validación: El servidor valida tipo MIME y extensión antes de procesar
- Metadatos IA: Campos como \`prompt\`, \`seed\`, \`model_name\` se guardan en \`lineage\` (JSON)
- Seguridad: URLs firmadas con expiración para acceso controlado
- UI: El frontend detecta automáticamente el tipo de archivo y muestra preview apropiado (image viewer, text reader)

**Respuesta:**
Retorna la versión actualizada con el nuevo \`filePath\` que contiene la URL pública del archivo.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la versión (integer)',
    example: 123,
    type: 'number',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Archivo principal de la versión. Soporta imágenes (PNG, JPG, WEBP) y archivos de texto (TXT, MD, JSON). Tamaño máximo: 2GB.',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo subido y versión actualizada',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL pública del archivo' },
        fileName: {
          type: 'string',
          description: 'Nombre del archivo guardado',
        },
        filePath: {
          type: 'string',
          description: 'Ruta completa en el sistema',
        },
      },
    },
  })
  async uploadFile(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @CurrentUser() currentUser?: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.versionsService.uploadFile(id, file, userContext);
  }
}
