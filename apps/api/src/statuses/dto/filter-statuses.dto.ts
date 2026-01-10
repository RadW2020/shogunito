import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn, IsArray, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApplicableEntity } from '../../entities/status.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * DTO para filtrar statuses en el endpoint GET /statuses
 *
 * Permite filtrar la lista de statuses por múltiples criterios:
 * - Estado activo/inactivo (exacto)
 * - Entidades aplicables (contiene cualquiera de las especificadas)
 * - Color (exacto)
 * - Usuario creador (búsqueda parcial, case-insensitive)
 * - Usuario asignado (búsqueda parcial, case-insensitive)
 * - Código del status (búsqueda parcial, case-insensitive)
 * - Nombre del status (búsqueda parcial, case-insensitive)
 *
 * Todos los filtros son opcionales y se pueden combinar.
 *
 * @example
 * // Filtrar por estados activos
 * GET /statuses?isActive=true
 *
 * // Filtrar por entidades aplicables
 * GET /statuses?applicableEntities=shot,asset
 *
 * // Filtros combinados
 * GET /statuses?isActive=true&applicableEntities=project&color=%23FF0000
 */
export class FilterStatusesDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return undefined;
  })
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Filtrar statuses por estado activo/inactivo',
    example: true,
    type: 'boolean',
  })
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: string | string[] | undefined }): string[] =>
    Array.isArray(value) ? value : value?.split(',') || [],
  )
  @IsArray()
  @IsIn(['project', 'episode', 'sequence', 'shot', 'version', 'asset', 'note', 'all'], {
    each: true,
  })
  @ApiPropertyOptional({
    description:
      'Filtrar statuses que sean aplicables a cualquiera de las entidades especificadas. Acepta múltiples valores separados por coma',
    type: [String],
    example: ['shot', 'asset'],
    enum: ['project', 'episode', 'sequence', 'shot', 'version', 'asset', 'note', 'all'],
  })
  applicableEntities?: (ApplicableEntity | 'all')[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filtrar statuses por color hexadecimal exacto',
    example: '#FF0000',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar statuses por ID del usuario que los creó (igualdad exacta)',
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar statuses por ID del usuario asignado (igualdad exacta)',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filtrar statuses por código usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'PROGRESS',
    type: 'string',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filtrar statuses por nombre usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'Review',
    type: 'string',
  })
  name?: string;
}
