import { Type } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsNumber, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShotType } from '../../entities/shot.entity';
import { IsNotSQLInjection, IsNotXSS } from '../../common/validators/custom-validators';

export class CreateShotDto {
  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description:
      'Código único del shot para identificación rápida (se genera automáticamente si no se proporciona)',
    example: 'SH',
    maxLength: 50,
  })
  code?: string;

  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiProperty({
    description: 'Nombre descriptivo del shot',
    example: 'Establishing Shot',
    maxLength: 255,
  })
  name: string;

  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Descripción detallada del contenido y propósito del shot',
    example: 'Plano general que establece la ubicación principal de la escena',
    maxLength: 500,
  })
  description?: string;

  @IsNumber()
  @Min(1)
  @ApiProperty({
    description: 'Número de orden del shot dentro de la secuencia',
    example: 10,
    minimum: 1,
  })
  sequenceNumber: number;

  @IsOptional()
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID del estado inicial del shot en el pipeline de producción',
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
    example: ShotType.ESTABLISHING,
    enumName: 'ShotType',
  })
  shotType?: ShotType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({
    description: 'Duración del shot en frames',
    example: 120,
    minimum: 0,
  })
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Orden del shot en el corte final de la secuencia',
    example: 5,
    minimum: 1,
  })
  cutOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario asignado para trabajar en el shot',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;

  @IsNumber()
  @ApiProperty({
    description: 'ID de la secuencia a la que pertenece el shot',
    example: 456,
    type: 'number',
  })
  sequenceId: number;
}
