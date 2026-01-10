import { IsString, IsOptional, IsEnum, IsNumber, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateShotDto } from './create-shot.dto';
import { ShotType } from '../../entities/shot.entity';

export class UpdateShotDto extends PartialType(CreateShotDto) {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Código único del shot para identificación rápida',
    example: 'SH001_UPD',
    maxLength: 50,
  })
  code?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Nombre descriptivo del shot',
    example: 'Establishing Shot - Actualizado',
    maxLength: 255,
  })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción detallada del contenido y propósito del shot',
    example: 'Plano general actualizado que establece la ubicación con nuevos elementos',
    maxLength: 500,
  })
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Número de orden del shot dentro de la secuencia',
    example: 12,
    minimum: 1,
  })
  sequenceNumber?: number;

  @IsOptional()
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID del estado actual del shot en el pipeline de producción',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  statusId?: string;

  @IsOptional()
  @IsEnum(ShotType)
  @ApiPropertyOptional({
    description: 'Tipo de shot según el encuadre o composición',
    enum: ShotType,
    example: ShotType.CLOSEUP,
    enumName: 'ShotType',
  })
  shotType?: ShotType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({
    description: 'Duración final del shot en frames',
    example: 150,
    minimum: 0,
  })
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Orden actualizado del shot en el corte final',
    example: 3,
    minimum: 1,
  })
  cutOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario que creó el shot',
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario asignado para trabajar en el shot',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID de la secuencia a la que pertenece el shot',
    example: 456,
    type: 'number',
  })
  sequenceId?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Código de la secuencia a la que pertenece el shot (backward compatibility)',
    example: 'SEQ',
    type: 'string',
  })
  sequenceCode?: string;
}
