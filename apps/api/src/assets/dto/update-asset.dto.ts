import { Type } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsUUID, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';
import { AssetType } from '@shogunito/shared';

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Código único identificador del asset',
    example: 'CHAR_001_UPD',
    maxLength: 50,
  })
  code?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Nombre descriptivo del asset',
    example: 'Personaje Principal - Actualizado',
    maxLength: 255,
  })
  name?: string;

  @IsOptional()
  @IsEnum(AssetType)
  @ApiPropertyOptional({
    description: 'Tipo de asset (subtitles, imagen, audio, script, text, video)',
    enum: AssetType,
    example: AssetType.DIRECTOR_SCRIPT,
    enumName: 'AssetType',
  })
  assetType?: AssetType;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: 'ID del estado actual del asset en el pipeline de producción',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  statusId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción detallada del asset',
    example: 'Modelo 3D actualizado con nuevas características y texturizado completo',
    maxLength: 1000,
  })
  description?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Ruta al archivo de thumbnail del asset',
    example: '/uploads/thumbnails/asset_123_v2.jpg',
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
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID de la versión asociada al asset',
    example: '75fbbe15-d89b-4684-8e28-b91ec4ebef07',
    format: 'uuid',
  })
  versionId?: string;
}
