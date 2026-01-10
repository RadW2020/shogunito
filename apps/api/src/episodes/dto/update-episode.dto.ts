import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';
import { CreateEpisodeDto } from './create-episode.dto';

export class UpdateEpisodeDto extends PartialType(
  OmitType(CreateEpisodeDto, ['statusId'] as const),
) {
  @ApiPropertyOptional({
    description: 'Número del episodio en la serie',
    example: 2,
    type: 'number',
  })
  @IsOptional()
  @IsNumber()
  epNumber?: number;

  @ApiPropertyOptional({
    description:
      'Código único del episodio para identificación interna (no incluye número de episodio)',
    example: 'MAGIC_UPDATED',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Nombre descriptivo del episodio',
    example: 'El Inicio de la Aventura - Versión Final',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del episodio, sinopsis y contenido',
    example:
      'Primer episodio revisado donde los protagonistas se conocen y comienza su aventura épica con nuevas escenas',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'ID del estado actual del episodio en el proceso de producción',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional({
    description: 'Duración final del episodio en segundos',
    example: 1480,
    type: 'number',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Usuario que creó el episodio',
    example: 'director@studio.com',
    type: 'string',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  createdBy?: number;

  @ApiPropertyOptional({
    description: 'ID del usuario asignado como responsable del episodio',
    example: 1,
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assignedTo?: number;

  @ApiPropertyOptional({
    description: 'ID del proyecto al que pertenece este episodio',
    example: 123,
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectId?: number;
}
