import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsNumber, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * DTO para filtrar episodios en el endpoint GET /episodes
 *
 * Permite filtrar la lista de episodios por múltiples criterios:
 * - ID del estado del episodio (UUID)
 * - ID del proyecto (exacto)
 * - Usuario creador (búsqueda parcial, case-insensitive)
 * - Usuario asignado (búsqueda parcial, case-insensitive)
 *
 * Todos los filtros son opcionales y se pueden combinar.
 * Incluye soporte para paginación y ordenamiento heredado de PaginationDto.
 *
 * @example
 * // Filtrar por estado específico
 * GET /episodes?statusId=123e4567-e89b-12d3-a456-426614174000
 *
 * // Filtrar por proyecto específico
 * GET /episodes?projectId=550e8400-e29b-41d4-a716-446655440000
 *
 * // Filtros combinados con paginación
 * GET /episodes?statusId=123e4567-e89b-12d3-a456-426614174000&projectId=550e8400-e29b-41d4-a716-446655440000&createdBy=director&page=1&limit=10
 */
export class FilterEpisodesDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: 'Filtrar episodios por ID del estado',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  statusId?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar episodios por ID del proyecto al que pertenecen',
    example: 123,
    type: 'number',
  })
  projectId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar episodios por ID del usuario que los creó (igualdad exacta)',
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar episodios por ID del usuario asignado como responsable',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;
}
