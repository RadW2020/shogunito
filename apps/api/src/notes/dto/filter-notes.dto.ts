import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LinkType } from '../../entities/note.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * DTO para filtrar notas en el endpoint GET /notes
 *
 * Permite filtrar la lista de notas por múltiples criterios:
 * - ID de la entidad vinculada (exacto)
 * - Tipo de entidad vinculada (exacto)
 * - Estado de lectura (exacto)
 * - Usuario creador (búsqueda parcial, case-insensitive)
 * - Usuario asignado (búsqueda parcial, case-insensitive)
 * - Asunto de la nota (búsqueda parcial, case-insensitive)
 * - Contenido de la nota (búsqueda parcial, case-insensitive)
 *
 * Todos los filtros son opcionales y se pueden combinar.
 * Incluye soporte para paginación y ordenamiento heredado de PaginationDto.
 *
 * @example
 * // Filtrar notas de un proyecto específico
 * GET /notes?linkId=uuid&linkType=Project
 *
 * // Filtrar notas no leídas asignadas a un usuario
 * GET /notes?isRead=false&assignedTo=animator
 *
 * // Búsqueda de texto en asunto y contenido con paginación
 * GET /notes?subject=animación&content=frames&page=1&limit=20
 */
export class FilterNotesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filtrar notas por ID o código de la entidad vinculada',
    example: 'RAT_HERO',
    type: 'string',
  })
  linkId?: string;

  @IsOptional()
  @IsEnum(LinkType)
  @ApiPropertyOptional({
    description: 'Filtrar notas por tipo de entidad vinculada',
    enum: LinkType,
    example: LinkType.PROJECT,
    enumName: 'LinkType',
  })
  linkType?: LinkType;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Filtrar notas por estado de lectura',
    example: false,
    type: 'boolean',
  })
  isRead?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar notas por ID del usuario creador (igualdad exacta)',
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Filtrar notas por ID del usuario asignado (igualdad exacta)',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filtrar notas por asunto usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'animación',
    type: 'string',
  })
  subject?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Filtrar notas por contenido usando búsqueda parcial (ILIKE). No sensible a mayúsculas',
    example: 'frames',
    type: 'string',
  })
  content?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Filtrar notas que tienen archivos adjuntos',
    example: true,
    type: 'boolean',
  })
  hasAttachments?: boolean;
}
