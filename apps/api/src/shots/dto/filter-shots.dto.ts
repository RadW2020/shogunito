import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ShotType } from '../../entities/shot.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * DTO para filtrar shots en el endpoint GET /shots
 *
 * Permite filtrar la lista de shots por múltiples criterios:
 * - Estado del shot (exacto)
 * - Tipo de shot (exacto)
 * - ID de la secuencia (exacto)
 * - Orden de corte (exacto)
 * - Número de secuencia (exacto)
 * - Usuario creador (búsqueda parcial, case-insensitive)
 * - Usuario asignado (búsqueda parcial, case-insensitive)
 *
 * Todos los filtros son opcionales y se pueden combinar.
 * Incluye soporte para paginación y ordenamiento heredado de PaginationDto.
 *
 * @example
 * // Filtrar por estado en progreso
 * GET /shots?status=ip
 *
 * // Filtrar por secuencia específica (legacy)
 * GET /shots?sequenceId=550e8400-e29b-41d4-a716-446655440001
 *
 * // Filtros combinados con paginación (sequenceId es legacy)
 * GET /shots?status=fin&shotType=closeup&sequenceId=550e8400-e29b-41d4-a716-446655440001&page=1&limit=20
 */
export class FilterShotsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filtrar shots por código de estado',
    example: 'in_progress',
    type: 'string',
  })
  status?: string;

  @IsOptional()
  @IsEnum(ShotType)
  @ApiPropertyOptional({
    description: 'Filtrar shots por tipo',
    enum: ShotType,
    example: ShotType.CLOSEUP,
    enumName: 'ShotType',
  })
  shotType?: ShotType;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar shots por ID de la secuencia a la que pertenecen',
    example: 456,
    type: 'number',
  })
  sequenceId?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filtrar shots por código de la secuencia a la que pertenecen (backward compatibility)',
    example: 'SEQ001',
    type: 'string',
  })
  sequenceCode?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Filtrar shots por orden de corte específico',
    example: 1,
    type: 'number',
    minimum: 1,
  })
  cutOrder?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Filtrar shots por número de secuencia específico',
    example: 5,
    type: 'number',
    minimum: 1,
  })
  sequenceNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar shots por usuario que los creó',
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar shots por ID del usuario asignado como responsable',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;
}
