import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsUUID, IsDateString, MinLength, IsNumber } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({
    description: 'Código único del proyecto para identificación interna',
    example: 'PROJ_001_UPDATED',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @ApiPropertyOptional({
    description: 'Nombre descriptivo del proyecto',
    example: 'Serie Animada Temporada 1 - Actualizada',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del proyecto, objetivos y alcance',
    example: 'Producción de 15 episodios para serie animada dirigida a público infantil y juvenil',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'ID del estado actual del proyecto',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional({
    description: 'Nombre del cliente para el cual se desarrolla el proyecto',
    example: 'Disney Studios',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del proyecto en formato ISO',
    example: '2024-02-01',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha estimada de finalización del proyecto en formato ISO',
    example: '2025-01-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'ID del usuario que creó el proyecto',
    example: 1,
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  createdBy?: number;
}
