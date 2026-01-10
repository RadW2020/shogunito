import { IsString, IsOptional, IsArray, IsNumber, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { CreatePlaylistDto } from './create-playlist.dto';

export class UpdatePlaylistDto extends PartialType(CreatePlaylistDto) {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Código único identificador de la playlist',
    example: 'PL_EP001_FINAL',
    maxLength: 50,
  })
  code?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Nombre descriptivo de la playlist',
    example: 'Episode 1 - Final Review',
    maxLength: 255,
  })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Descripción detallada del propósito de la playlist',
    example: 'Playlist actualizada con las versiones finales para aprobación del cliente',
    maxLength: 1000,
  })
  description?: string;

  @IsOptional()
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID del estado actual de la playlist en el proceso de revisión',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  statusId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Lista actualizada de códigos de las versiones incluidas en esta playlist',
    type: [String],
    example: ['SH_003', 'SEQ_002', 'EP_001'],
    isArray: true,
  })
  versionCodes?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario que creó la playlist',
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario asignado para revisar la playlist',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del proyecto al que pertenece la playlist',
    example: 123,
    type: 'number',
  })
  projectId?: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Fecha y hora de la última actualización del estado de la playlist',
    type: Date,
    example: '2024-01-15T16:30:00Z',
  })
  statusUpdatedAt?: Date;
}
