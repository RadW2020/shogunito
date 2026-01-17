import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AssetType } from '@shogunito/shared';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * DTO para filtrar assets en el endpoint GET /assets
 *
 * Permite filtrar la lista de assets por múltiples criterios:
 * - Estado del asset (exacto)
 * - Tipo de asset (exacto)
 * - ID del proyecto (exacto)
 * - ID de la versión (exacto)
 * - Usuario creador (búsqueda parcial, case-insensitive)
 * - Usuario asignado (búsqueda parcial, case-insensitive)
 *
 * Todos los filtros son opcionales y se pueden combinar.
 * Incluye soporte para paginación y ordenamiento heredado de PaginationDto.
 *
 * @example
 * // Filtrar por estado en progreso
 * GET /assets?status=ip
 *
 * // Filtrar por proyecto específico
 * GET /assets?projectId=550e8400-e29b-41d4-a716-446655440001
 *
 * // Filtros combinados con paginación
 * GET /assets?status=fin&assetType=character&projectId=550e8400-e29b-41d4-a716-446655440001&page=1&limit=15
 */
export class FilterAssetsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filtrar assets por código de estado',
    example: 'in_progress',
    type: 'string',
  })
  status?: string;

  @IsOptional()
  @IsEnum(AssetType)
  @ApiPropertyOptional({
    description: 'Filtrar assets por tipo (subtitles, imagen, audio, script, text)',
    enum: AssetType,
    example: AssetType.DIRECTOR_SCRIPT,
    enumName: 'AssetType',
  })
  assetType?: AssetType;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar assets por ID del proyecto al que pertenecen',
    example: 123,
    type: 'number',
  })
  projectId?: number;

  @IsOptional()
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filtrar assets por ID de la versión asociada',
    example: '75fbbe15-d89b-4684-8e28-b91ec4ebef07',
    type: 'string',
    format: 'uuid',
  })
  versionId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar assets por ID del usuario que los creó',
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar assets por ID del usuario asignado como responsable',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;
}
