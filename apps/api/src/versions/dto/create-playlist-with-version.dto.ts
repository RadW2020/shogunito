import { IsString, IsOptional, IsArray, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlaylistWithVersionDto {
  // Playlist fields
  @IsString()
  @ApiProperty({
    description: 'Nombre descriptivo de la playlist',
    example: 'Episode 2 - Rough Cut Review',
    maxLength: 255,
  })
  name: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del proyecto al que pertenece la playlist (preferido para entidades migradas)',
    example: 123,
    type: 'number',
  })
  projectId?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Código del proyecto al que pertenece la playlist (backward compatibility)',
    example: 'PROJ',
  })
  projectCode?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Código único de la playlist para identificación rápida (se genera automáticamente si no se proporciona)',
    example: 'PL',
    maxLength: 50,
  })
  code?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción del propósito de la playlist',
    example:
      'Playlist con el rough cut del episodio 2 para revisión interna del equipo de dirección',
    maxLength: 500,
  })
  description?: string;

  @IsOptional()
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID del estado inicial de la playlist',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  statusId?: string;

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'Array de IDs de versiones incluidas en la playlist',
    example: ['123e4567-e89b-12d3-a456-426614174000', '456e7890-e12b-34d5-a678-426614174001'],
    type: [String],
  })
  versionIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario asignado para revisar la playlist',
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
    example: 'PL_001',
    maxLength: 50,
  })
  versionCode?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Nombre descriptivo de la versión (se genera automáticamente si no se proporciona)',
    example: 'Episode 2 - Rough Cut Review v001',
    maxLength: 255,
  })
  versionName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción detallada de los cambios en esta versión',
    example:
      'Playlist con el rough cut del episodio 2 para revisión interna del equipo de dirección',
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
    description: 'Ruta al archivo multimedia principal de la versión',
    example: '/uploads/versions/PL_EP002_ROUGH_001.mov',
  })
  filePath?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Formato del archivo multimedia',
    example: 'MOV',
  })
  format?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Rango de frames de la versión',
    example: '1-1000',
  })
  frameRange?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Nombre del artista que creó esta versión',
    example: 'Editor Principal',
  })
  artist?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Usuario asignado para revisar esta versión',
    example: 'director@studio.com',
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
