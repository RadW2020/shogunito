import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from '@shogun/shared';
import { IsNotSQLInjection, IsNotXSS } from '../../common/validators/custom-validators';

export class CreateAssetDto {
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiProperty({
    description: 'Código único identificador del asset',
    example: 'CHAR',
    maxLength: 50,
  })
  code: string;

  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiProperty({
    description: 'Nombre descriptivo del asset',
    example: 'Personaje Principal',
    maxLength: 255,
  })
  name: string;

  @IsEnum(AssetType)
  @ApiProperty({
    description: 'Tipo de asset (subtitles, imagen, audio, script, text, video)',
    enum: AssetType,
    example: AssetType.DIRECTOR_SCRIPT,
    enumName: 'AssetType',
  })
  assetType: AssetType;

  @IsOptional()
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID del estado inicial del asset en el pipeline de producción',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  statusId?: string;

  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Descripción detallada del asset',
    example: 'Modelo 3D del personaje principal con rig completo',
    maxLength: 1000,
  })
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Ruta al archivo de thumbnail del asset',
    example: '/uploads/thumbnails/asset_123.jpg',
  })
  thumbnailPath?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario asignado para trabajar en el asset',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del proyecto al que pertenece el asset',
    example: 123,
    type: 'number',
  })
  projectId?: number;

  @IsOptional()
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiPropertyOptional({
    description: 'Código del proyecto al que pertenece el asset',
    example: 'TEST_PRJ_001',
  })
  projectCode?: string;
}
