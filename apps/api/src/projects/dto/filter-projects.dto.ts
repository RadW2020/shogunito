import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * DTO para filtrar proyectos en el endpoint GET /projects
 *
 * Permite filtrar la lista de proyectos por múltiples criterios:
 * - ID del estado del proyecto (exacto)
 * - Nombre del cliente (búsqueda parcial, case-insensitive)
 * - Usuario creador (búsqueda parcial, case-insensitive)
 * - Usuario asignado (búsqueda parcial, case-insensitive)
 *
 * Todos los filtros son opcionales y se pueden combinar.
 * Incluye soporte para paginación y ordenamiento heredado de PaginationDto.
 *
 * @example
 * // Filtrar por estado específico
 * GET /projects?statusId=123e4567-e89b-12d3-a456-426614174000
 *
 * // Filtrar por cliente que contenga "Netflix"
 * GET /projects?clientName=Netflix
 *
 * // Filtros combinados con paginación
 * GET /projects?statusId=123e4567-e89b-12d3-a456-426614174000&clientName=Animation&createdBy=Antonio&page=1&limit=10
 */
export class FilterProjectsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: 'Filtrar proyectos por ID del estado',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  statusId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filtrar proyectos por nombre del cliente',
    example: 'Netflix Studios',
    type: 'string',
  })
  clientName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filtrar proyectos por ID del usuario que los creó',
    example: 1,
    type: 'number',
  })
  @Type(() => Number)
  @IsNumber()
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar proyectos por ID del usuario asignado como responsable',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;
}
