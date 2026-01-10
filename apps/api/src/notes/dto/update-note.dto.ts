import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateNoteDto } from './create-note.dto';
import { LinkType } from '../../entities/note.entity';

export class UpdateNoteDto extends PartialType(CreateNoteDto) {
  @IsOptional()
  @IsUUID()
  @IsString()
  @ApiPropertyOptional({
    description: 'ID de la entidad a la que se vincula la nota',
    example: '987e6543-e21b-12d3-a456-426614174000',
    format: 'uuid',
  })
  linkId?: string;

  @IsOptional()
  @IsEnum(LinkType)
  @ApiPropertyOptional({
    description: 'Tipo de entidad a la que se vincula la nota',
    enum: LinkType,
    example: LinkType.VERSION,
    enumName: 'LinkType',
  })
  linkType?: LinkType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @ApiPropertyOptional({
    description: 'Asunto o título de la nota',
    example: 'Revisión de animación - Actualizado',
    minLength: 1,
    maxLength: 255,
  })
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @ApiPropertyOptional({
    description: 'Contenido detallado de la nota',
    example:
      'Actualización: Los ajustes en los frames 120-150 han sido completados satisfactoriamente',
    minLength: 1,
    maxLength: 5000,
  })
  content?: string;



  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Marca si la nota ha sido leída',
    example: true,
  })
  isRead?: boolean;

  @IsOptional()
  @IsArray()
  @Matches(/^https?:\/\/.+/i, {
    each: true,
    message: 'each value in attachments must be a valid URL',
  })
  @ApiPropertyOptional({
    description: 'Lista actualizada de URLs de archivos adjuntos',
    type: [String],
    example: ['http://localhost:9000/attachments/2025/09/21/documento_v2.pdf'],
    isArray: true,
  })
  attachments?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario que creó la nota',
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario al que se reasigna la nota',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;
}
