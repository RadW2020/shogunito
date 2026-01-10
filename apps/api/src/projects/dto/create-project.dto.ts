import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import {
  IsNotSQLInjection,
  IsNotXSS,
  IsTrimmedLength,
} from '../../common/validators/custom-validators';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Código único del proyecto para identificación interna',
    example: 'PROJ_001',
    type: 'string',
  })
  @IsNotEmpty({ message: 'El código del proyecto es requerido' })
  @IsString()
  @IsTrimmedLength(2, 50, {
    message: 'El código debe tener entre 2 y 50 caracteres (después de eliminar espacios)',
  })
  @IsNotSQLInjection()
  @IsNotXSS()
  code: string;

  @ApiProperty({
    description: 'Nombre descriptivo del proyecto',
    example: 'Serie Animada Temporada 1',
    type: 'string',
  })
  @IsNotEmpty({ message: 'El nombre del proyecto es requerido' })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(255, { message: 'El nombre no puede exceder 255 caracteres' })
  @IsNotSQLInjection()
  @IsNotXSS()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del proyecto, objetivos y alcance',
    example: 'Producción de 12 episodios para serie animada dirigida a público infantil',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  description?: string;

  @ApiPropertyOptional({
    description: 'ID del estado inicial del proyecto',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional({
    description: 'Nombre del cliente para el cual se desarrolla el proyecto',
    example: 'Netflix Studios',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  clientName?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del proyecto en formato ISO',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha estimada de finalización del proyecto en formato ISO',
    example: '2024-12-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
