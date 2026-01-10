import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsHexColor,
  Min,
  Max,
  ArrayNotEmpty,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicableEntity } from '../../entities/status.entity';
import { IsNotSQLInjection, IsNotXSS } from '../../common/validators/custom-validators';

export class CreateStatusDto {
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiProperty({
    description: 'Código único identificador del estado',
    example: 'IN_PROGRESS',
    maxLength: 50,
    uniqueItems: true,
  })
  code: string;

  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiProperty({
    description: 'Nombre descriptivo del estado',
    example: 'En Progreso',
    maxLength: 255,
  })
  name: string;

  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Descripción detallada del estado y su propósito',
    example: 'El elemento está siendo trabajado activamente por el equipo',
    maxLength: 1000,
  })
  description?: string;

  @IsHexColor()
  @ApiProperty({
    description: 'Color hexadecimal para representar visualmente el estado',
    example: '#FFA500',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  color: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Indica si el estado está activo y disponible para usar',
    example: true,
    default: true,
  })
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999)
  @ApiPropertyOptional({
    description: 'Orden de clasificación para mostrar los estados',
    example: 10,
    default: 0,
    minimum: 0,
    maximum: 999,
  })
  sortOrder?: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['project', 'episode', 'sequence', 'version', 'asset', 'note', 'all'], {
    each: true,
  })
  @ApiProperty({
    description:
      'Lista de entidades a las que se puede aplicar este estado. Si incluye "all", aplica a todas las entidades',
    type: [String],
    example: ['project', 'asset'],
    enum: ['project', 'episode', 'sequence', 'version', 'asset', 'note', 'all'],
  })
  applicableEntities: (ApplicableEntity | 'all')[];

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
