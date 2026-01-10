import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsHexColor,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateStatusDto } from './create-status.dto';
import { ApplicableEntity } from '../../entities/status.entity';

export class UpdateStatusDto extends PartialType(CreateStatusDto) {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Código único identificador del estado',
    example: 'IN_PROGRESS_UPD',
    maxLength: 50,
  })
  code?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Nombre descriptivo del estado',
    example: 'En Progreso - Actualizado',
    maxLength: 255,
  })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción detallada del estado y su propósito',
    example: 'El elemento está siendo trabajado activamente por el equipo - versión actualizada',
    maxLength: 1000,
  })
  description?: string;

  @IsOptional()
  @IsHexColor()
  @ApiPropertyOptional({
    description: 'Color hexadecimal para representar visualmente el estado',
    example: '#00FF00',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  color?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Indica si el estado está activo y disponible para usar',
    example: false,
  })
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999)
  @ApiPropertyOptional({
    description: 'Orden de clasificación para mostrar los estados',
    example: 15,
    minimum: 0,
    maximum: 999,
  })
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @IsIn(['project', 'episode', 'sequence', 'shot', 'version', 'asset', 'note', 'all'], {
    each: true,
  })
  @ApiPropertyOptional({
    description: 'Lista de entidades a las que se puede aplicar este estado',
    type: [String],
    example: ['shot', 'asset'],
    enum: ['project', 'episode', 'sequence', 'shot', 'version', 'asset', 'note', 'all'],
  })
  applicableEntities?: (ApplicableEntity | 'all')[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario que creó el estado',
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario responsable de mantener este estado',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;
}
