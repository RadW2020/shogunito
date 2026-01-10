import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, Min, IsUUID } from 'class-validator';
import { CreateSequenceDto } from './create-sequence.dto';

export class UpdateSequenceDto extends PartialType(CreateSequenceDto) {
  @ApiPropertyOptional({
    description: 'Código único de la secuencia para identificación interna',
    example: 'SEQ_001_UPDATED',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Nombre descriptivo de la secuencia',
    example: 'Escena del Bosque Encantado - Versión Final',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada de la secuencia, eventos y contenido narrativo',
    example:
      'Los protagonistas se adentran en el bosque mágico donde encuentran criaturas fantásticas y descubren un artefacto misterioso',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Orden actualizado de la secuencia en el montaje final del episodio',
    example: 3,
    type: 'number',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  cutOrder?: number;

  @ApiPropertyOptional({
    description: 'ID del estado actual de la secuencia en el proceso de producción',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional({
    description: 'Duración final de la secuencia en segundos',
    example: 135,
    type: 'number',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Identificador actualizado de la historia o guión asociado',
    example: 'STORY_EP01_001_2',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  storyId?: string;

  @ApiPropertyOptional({
    description: 'Usuario que creó la secuencia',
    example: 'storyboard@studio.com',
    type: 'string',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  createdBy?: number;

  @ApiPropertyOptional({
    description: 'ID del usuario asignado como responsable de la secuencia',
    example: 1,
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assignedTo?: number;

  @ApiPropertyOptional({
    description: 'ID del episodio al que pertenece esta secuencia',
    example: 123,
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  episodeId?: number;
}
