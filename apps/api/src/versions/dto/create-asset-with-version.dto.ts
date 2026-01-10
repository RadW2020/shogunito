import { IsString, IsOptional, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from '@shogun/shared';

export class CreateAssetWithVersionDto {
  // Asset fields
  @IsString()
  @ApiProperty({
    description: 'Nombre descriptivo del asset',
    example: 'Personaje Principal',
    maxLength: 255,
  })
  name: string;

  @IsEnum(AssetType)
  @ApiProperty({
    description:
      'Tipo de asset según su función en el proyecto (subtitles, imagen, audio, script, text, video)',
    enum: AssetType,
    example: AssetType.SCRIPT,
    enumName: 'AssetType',
  })
  assetType: AssetType;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del proyecto al que pertenece el asset (preferido para entidades migradas)',
    example: 123,
    type: 'number',
  })
  projectId?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Código del proyecto al que pertenece el asset (backward compatibility)',
    example: 'PROJ',
  })
  projectCode?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Código único del asset para identificación rápida (se genera automáticamente si no se proporciona)',
    example: 'CHAR',
    maxLength: 50,
  })
  code?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción detallada del contenido y propósito del asset',
    example: 'Modelo 3D del protagonista con rig completo para animación',
    maxLength: 500,
  })
  description?: string;

  @IsOptional()
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID del estado inicial del asset en el pipeline de producción',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  statusId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Ruta al archivo de thumbnail del asset',
    example: '/uploads/thumbnails/character_concept.jpg',
  })
  thumbnailPath?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario asignado para trabajar en el asset',
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
    example: 'CHAR_001',
    maxLength: 50,
  })
  versionCode?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Nombre descriptivo de la versión (se genera automáticamente si no se proporciona)',
    example: 'Modelo 3D con Rig Completo',
    maxLength: 255,
  })
  versionName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción detallada de los cambios en esta versión',
    example: 'Modelo 3D del personaje principal con sistema de rigging para animación',
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
    example: '/uploads/versions/CHAR_HERO_001.MOV',
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
    example: '1-100',
  })
  frameRange?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Nombre del artista que creó esta versión',
    example: 'María García',
  })
  artist?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Usuario asignado para revisar esta versión',
    example: 'rigger@studio.com',
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
