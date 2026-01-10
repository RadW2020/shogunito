import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * DTO para filtrar playlists en el endpoint GET /playlists
 *
 * Permite filtrar la lista de playlists por múltiples criterios:
 * - Estado de la playlist (exacto)
 * - ID del proyecto (exacto)
 * - Usuario creador (búsqueda parcial, case-insensitive)
 * - Usuario asignado (búsqueda parcial, case-insensitive)
 * - Código de la playlist (búsqueda parcial, case-insensitive)
 * - Nombre de la playlist (búsqueda parcial, case-insensitive)
 *
 * Todos los filtros son opcionales y se pueden combinar.
 * Incluye soporte para paginación y ordenamiento heredado de PaginationDto.
 *
 * @example
 * // Filtrar por estado en revisión
 * GET /playlists?status=rev
 *
 * // Filtrar por proyecto específico
 * GET /playlists?projectId=b899d424-0d20-451d-af78-e965d0d6d717
 *
 * // Filtros combinados con paginación
 * GET /playlists?status=ip&projectId=b899d424-0d20-451d-af78-e965d0d6d717&assignedTo=director&page=1&limit=10
 */
export class FilterPlaylistsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filtrar playlists por código de estado',
    example: 'review',
    type: 'string',
  })
  status?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar playlists por ID del proyecto al que pertenecen',
    example: 123,
    type: 'number',
  })
  projectId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar playlists por ID del usuario que las creó (igualdad exacta)',
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar playlists por ID del usuario asignado (igualdad exacta)',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filtrar playlists por código usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'EP001',
    type: 'string',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filtrar playlists por nombre usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'Rough Cut',
    type: 'string',
  })
  name?: string;
}
