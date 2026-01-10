import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';
import { IsNotSQLInjection, IsNotXSS } from '../../common/validators/custom-validators';

export class CreateEpisodeDto {
  @ApiPropertyOptional({
    description: 'Número del episodio en la serie',
    example: 1,
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  epNumber?: number;

  @ApiProperty({
    description: 'Orden del episodio en el montaje final del proyecto',
    example: 5,
    type: 'number',
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cutOrder: number;

  @ApiProperty({
    description:
      'Código único del episodio para identificación interna (no incluye número de episodio)',
    example: 'MAGIC',
    type: 'string',
  })
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  code: string;

  @ApiProperty({
    description: 'Nombre descriptivo del episodio',
    example: 'El Inicio de la Aventura',
    type: 'string',
  })
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del episodio, sinopsis y contenido',
    example: 'Primer episodio donde los protagonistas se conocen y comienza su aventura épica',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  description?: string;

  @ApiPropertyOptional({
    description: 'ID del estado inicial del episodio en el proceso de producción',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional({
    description: 'Duración estimada del episodio en segundos',
    example: 1440,
    type: 'number',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    description: 'ID del usuario que crea el episodio',
    example: 1,
    type: 'number',
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

  @ApiProperty({
    description: 'ID del proyecto al que pertenece este episodio',
    example: 123,
    type: 'number',
  })
  @Type(() => Number)
  @IsNumber()
  projectId: number;
}
