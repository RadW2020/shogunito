import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * DTO para filtrar secuencias en el endpoint GET /sequences
 *
 * Permite filtrar la lista de secuencias por múltiples criterios:
 * - Estado de la secuencia (exacto)
 * - ID del episodio (exacto)
 * - Orden de corte (exacto)
 * - Usuario creador (búsqueda parcial, case-insensitive)
 * - Usuario asignado (búsqueda parcial, case-insensitive)
 *
 * Todos los filtros son opcionales y se pueden combinar.
 *
 * @example
 * // Filtrar por estado en progreso
 * GET /sequences?status=ip
 *
 * // Filtrar por episodio específico
 * GET /sequences?episodeId=550e8400-e29b-41d4-a716-446655440001
 *
 * // Filtros combinados
 * GET /sequences?status=wtg&episodeId=550e8400-e29b-41d4-a716-446655440001&cutOrder=1
 */
export class FilterSequencesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filtrar secuencias por código de estado',
    example: 'in_progress',
    type: 'string',
  })
  status?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar secuencias por ID del episodio al que pertenecen',
    example: 123,
    type: 'number',
  })
  episodeId?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar secuencias por ID del proyecto (a través del episodio)',
    example: 456,
    type: 'number',
  })
  projectId?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Filtrar secuencias por orden de corte específico',
    example: 1,
    type: 'number',
    minimum: 1,
  })
  cutOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar secuencias por ID del usuario que las creó (igualdad exacta)',
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar secuencias por ID del usuario asignado como responsable',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;
}
