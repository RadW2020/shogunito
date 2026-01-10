import { IsString, IsOptional, IsEnum, IsNumber, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShotType } from '../../entities/shot.entity';

export class CreateShotWithVersionDto {
  // Shot fields
  @IsString()
  @ApiProperty({
    description: 'Nombre descriptivo del shot',
    example: 'Establishing Shot',
    maxLength: 255,
  })
  name: string;

  @IsNumber()
  @Min(1)
  @ApiProperty({
    description: 'Número de orden del shot dentro de la secuencia',
    example: 10,
    minimum: 1,
  })
  sequenceNumber: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description:
      'ID de la secuencia a la que pertenece el shot (preferido para entidades migradas)',
    example: 123,
    type: 'number',
  })
  sequenceId?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Código de la secuencia a la que pertenece el shot (backward compatibility)',
    example: 'SEQ',
  })
  sequenceCode?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Código único del shot para identificación rápida (se genera automáticamente si no se proporciona)',
    example: 'SH',
    maxLength: 50,
  })
  code?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción detallada del contenido y propósito del shot',
    example: 'Plano general que establece la ubicación principal de la escena',
    maxLength: 500,
  })
  description?: string;

  @IsOptional()
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID del estado inicial del shot en el pipeline de producción',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  statusId?: string;

  @IsOptional()
  @IsEnum(ShotType)
  @ApiPropertyOptional({
    description: 'Tipo de shot según el encuadre o composición',
    enum: ShotType,
    example: ShotType.ESTABLISHING,
    enumName: 'ShotType',
  })
  shotType?: ShotType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({
    description: 'Duración del shot en frames',
    example: 120,
    minimum: 0,
  })
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Orden del shot en el corte final de la secuencia',
    example: 5,
    minimum: 1,
  })
  cutOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario asignado para trabajar en el shot',
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
    example: 'SH_001',
    maxLength: 50,
  })
  versionCode?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Nombre descriptivo de la versión (se genera automáticamente si no se proporciona)',
    example: 'Versión Final con Corrección de Luces',
    maxLength: 255,
  })
  versionName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción detallada de los cambios en esta versión',
    example: 'Corrección de timing en la animación facial y ajuste de luces ambientales',
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
    example: '/uploads/versions/SH001_001.mov',
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
    example: '1001-1120',
  })
  frameRange?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Nombre del artista que creó esta versión',
    example: 'Juan Pérez',
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
  thumbnailPath?: string;

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
