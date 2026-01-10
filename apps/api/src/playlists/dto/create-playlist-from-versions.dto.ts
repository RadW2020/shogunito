import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlaylistFromVersionsDto {
  @ApiProperty({
    description: 'Código único identificador de la playlist',
    example: 'PL_REVIEW',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Nombre descriptivo de la playlist',
    example: 'Review Playlist - Selected Versions',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Descripción del propósito de la playlist',
    example: 'Playlist generada desde versiones seleccionadas',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'ID del proyecto al que pertenece la playlist',
    example: 123,
    type: 'number',
  })
  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty({
    description: 'Array de códigos de las versiones a incluir',
    type: [String],
    example: ['SH_003', 'SEQ_002', 'EP_001'],
  })
  @IsArray()
  @IsNotEmpty()
  versionCodes: string[];

  @ApiProperty({
    description: 'ID del estado inicial de la playlist',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  @IsString()
  statusId?: string;

  @ApiProperty({
    description: 'ID del usuario asignado para revisar',
    example: 1,
    type: 'number',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  assignedTo?: number;
}
