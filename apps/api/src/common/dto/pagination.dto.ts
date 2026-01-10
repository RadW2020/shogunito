import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Interfaz para la respuesta paginada
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Función helper para crear respuestas paginadas
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Base DTO para paginación y ordenamiento
 * Puede ser extendido por otros DTOs de filtrado para agregar
 * capacidades de paginación y ordenamiento estándar.
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Número de página para paginación',
    example: 1,
    type: 'number',
    minimum: 1,
    default: 1,
  })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({
    description: 'Número de elementos por página',
    example: 10,
    type: 'number',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  limit?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Campo por el cual ordenar los resultados',
    example: 'createdAt',
    type: 'string',
  })
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  @ApiPropertyOptional({
    description: 'Orden de los resultados (ASC o DESC)',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Búsqueda general en campos de texto',
    example: 'search term',
    type: 'string',
  })
  search?: string;
}
