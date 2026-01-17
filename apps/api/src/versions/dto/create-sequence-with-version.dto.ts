import { IsString, IsOptional, IsNumber, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSequenceWithVersionDto {
  // Sequence fields
  @IsString()
  @ApiProperty({
    description: 'Nombre descriptivo de la secuencia',
    example: 'Escena del Bosque Encantado',
    maxLength: 255,
  })
  name: string;

  @IsNumber()
  @Min(1)
  @ApiProperty({
    description: 'Orden de la secuencia en el episodio',
    example: 1,
    minimum: 1,
  })
  cutOrder: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description:
      'ID del episodio al que pertenece la secuencia (preferido para entidades migradas)',
    example: 123,
    type: 'number',
  })
  episodeId?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Código del episodio al que pertenece la secuencia (backward compatibility)',
    example: 'EP',
  })
  episodeCode?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Código único de la secuencia para identificación rápida (se genera automáticamente si no se proporciona)',
    example: 'SEQ',
    maxLength: 50,
  })
  code?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción detallada del contenido y propósito de la secuencia',
    example: 'Los protagonistas se adentran en el bosque mágico',
    maxLength: 500,
  })
  description?: string;

  @IsOptional()
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID del estado inicial de la secuencia en el pipeline de producción',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  statusId?: string;



  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID de la historia asociada a la secuencia',
    example: 'STORY_EP01_001',
  })
  storyId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario asignado para trabajar en la secuencia',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;

  // Version fields
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Código único identificador de la versión (se genera automáticamente si no se proporciona)',
    example: 'SEQ_001',
    maxLength: 50,
  })
  versionCode?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Nombre descriptivo de la versión (se genera automáticamente si no se proporciona)',
    example: 'Escena del Bosque - Layout Final',
    maxLength: 255,
  })
  versionName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción detallada de los cambios en esta versión',
    example: 'Layout final de la secuencia del bosque encantado',
    maxLength: 1000,
  })
  versionDescription?: string;

  @IsOptional()
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID del estado actual de la versión en el pipeline de aprobación',
    example: '223e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  versionStatusId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'URL o ruta del archivo principal de la versión (imagen PNG, JPG, WEBP). El tipo se detecta automáticamente por extensión.',
    example: '/uploads/versions/SEQ_001_001.png',
  })
  filePath?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Formato del archivo de imagen (PNG, JPG, WEBP). Debe coincidir con la extensión del filePath.',
    example: 'PNG',
  })
  format?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Rango de frames de la versión',
    example: '1-120',
  })
  frameRange?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Nombre del artista que creó esta versión',
    example: 'Layout Artist',
  })
  artist?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Usuario asignado para revisar esta versión',
    example: 'supervisor@studio.com',
  })
  versionAssignedTo?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Ruta al archivo de thumbnail de la versión',
    example: '/uploads/thumbnails/version_123.jpg',
  })
  versionThumbnailPath?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Indica si esta es la versión más reciente',
    example: true,
    default: true,
  })
  latest?: boolean;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Fecha y hora de publicación de la versión',
    type: Date,
    example: '2024-01-15T16:30:00Z',
  })
  publishedAt?: Date;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Historial de versiones anteriores y dependencias',
    example: 'v001 -> v002 -> v003',
  })
  lineage?: string;
}
