import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, Min, IsUUID } from 'class-validator';
import { IsNotSQLInjection, IsNotXSS } from '../../common/validators/custom-validators';

export class CreateSequenceDto {
  @ApiProperty({
    description: 'Código único de la secuencia para identificación interna',
    example: 'SEQ',
    type: 'string',
  })
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  code: string;

  @ApiProperty({
    description: 'Nombre descriptivo de la secuencia',
    example: 'Escena del Bosque Encantado',
    type: 'string',
  })
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada de la secuencia, eventos y contenido narrativo',
    example:
      'Los protagonistas se adentran en el bosque mágico donde encuentran criaturas fantásticas',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  description?: string;

  @ApiProperty({
    description: 'Orden de la secuencia en el montaje final del episodio',
    example: 5,
    type: 'number',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  cutOrder: number;

  @ApiPropertyOptional({
    description: 'ID del estado inicial de la secuencia en el proceso de producción',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional({
    description: 'Duración estimada de la secuencia en segundos',
    example: 120,
    type: 'number',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Identificador de la historia o guión asociado',
    example: 'STORY_EP01_001',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  storyId?: string;

  @ApiPropertyOptional({
    description: 'Usuario que crea la secuencia',
    example: 'storyboard@studio.com',
    type: 'string',
  })
  @ApiPropertyOptional({
    description: 'ID del usuario asignado como responsable de la secuencia',
    example: 1,
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assignedTo?: number;

  @ApiProperty({
    description: 'ID del episodio al que pertenece esta secuencia',
    example: 123,
    type: 'number',
  })
  @IsNumber()
  episodeId: number;
}
