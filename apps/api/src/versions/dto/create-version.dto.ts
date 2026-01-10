import { IsString, IsOptional, IsEnum, IsDefined, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VersionStatus } from '../../entities';
import {
  IsNotSQLInjection,
  IsNotXSS,
  IsStrictBoolean,
} from '../../common/validators/custom-validators';

export enum VersionEntityType {
  ASSET = 'asset',
  SEQUENCE = 'sequence',
  EPISODE = 'episode',
  PROJECT = 'project',
}

export class CreateVersionDto {
  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description:
      'Código de la entidad asociada (backward compatibility - usar entityId para entidades migradas)',
    example: 'ASSET_001',
  })
  entityCode?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description:
      'ID de la entidad asociada (para entidades migradas: asset, sequence, episode, project)',
    example: 123,
    type: 'number',
  })
  entityId?: number;

  @IsDefined({ message: 'entityType es requerido' })
  @IsEnum(VersionEntityType, {
    message: 'entityType debe ser uno de: asset, sequence, episode, project',
  })
  @ApiProperty({
    description: 'Tipo de entidad asociada',
    example: 'asset',
    enum: VersionEntityType,
    enumName: 'VersionEntityType',
  })
  entityType: VersionEntityType;

  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiProperty({
    description: 'Código único identificador de la versión',
    example: 'SH_003',
    maxLength: 50,
  })
  code: string;

  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiProperty({
    description: 'Nombre descriptivo de la versión',
    example: 'Versión Final con Corrección de Luces',
    maxLength: 255,
  })
  name: string;

  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Descripción detallada de los cambios en esta versión',
    example: 'Corrección de timing en la animación facial y ajuste de luces ambientales',
    maxLength: 1000,
  })
  description?: string;

  @IsOptional()
  @IsEnum(VersionStatus)
  @ApiPropertyOptional({
    description: 'Estado actual de la versión en el pipeline de aprobación',
    enum: VersionStatus,
    example: VersionStatus.REVIEW,
    default: VersionStatus.WIP,
    enumName: 'VersionStatus',
  })
  status?: VersionStatus;

  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Ruta al archivo multimedia principal de la versión',
    example: '/uploads/versions/SH001_003.mov',
  })
  filePath?: string;

  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Formato del archivo multimedia',
    example: 'MOV',
  })
  format?: string;

  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Rango de frames de la versión',
    example: '1001-1120',
  })
  frameRange?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Duración del video en segundos',
    example: 120.5,
    type: Number,
  })
  duration?: number;

  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Nombre del artista que creó esta versión',
    example: 'Juan Pérez',
  })
  artist?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario asignado para revisar esta versión',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;

  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Ruta al archivo de thumbnail de la versión',
    example: '/uploads/thumbnails/version_123.jpg',
  })
  thumbnailPath?: string;

  @IsOptional()
  @Transform(
    ({ value, key, obj }) => {
      // Store original value for validator to check
      // This works even with enableImplicitConversion: true
      if (obj && typeof obj === 'object') {
        obj[`__original_${key}__`] = value;
      }

      // Reject non-boolean values explicitly
      // If value is already a boolean, return it
      if (typeof value === 'boolean') {
        return value;
      }
      // If value is undefined or null, return it (optional field)
      if (value === undefined || value === null) {
        return value;
      }
      // For string values like 'yes', 'true', 'false', '1', '0', reject them
      // by returning a special value that will fail validation
      // We need to prevent class-transformer from converting strings to booleans
      if (typeof value === 'string') {
        // Reject all string values, even 'true' and 'false'
        // Return a non-boolean value that will fail IsStrictBoolean
        return 'INVALID_BOOLEAN_TYPE';
      }
      // For any other type (number, etc.), return a special value that will fail validation
      return 'INVALID_BOOLEAN_TYPE';
    },
    { toClassOnly: true, toPlainOnly: false },
  )
  @IsStrictBoolean({
    message: 'latest debe ser un valor booleano estricto (true o false), no una cadena',
  })
  @ApiPropertyOptional({
    description: 'Indica si esta es la versión más reciente',
    example: true,
    default: true,
    type: Boolean,
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
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Historial de versiones anteriores y dependencias',
    example: 'v001 -> v002 -> v003',
  })
  lineage?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Fecha y hora de la última actualización del status',
    type: Date,
    example: '2024-01-15T14:45:00Z',
  })
  statusUpdatedAt?: Date;
}
