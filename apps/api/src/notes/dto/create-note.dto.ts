import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  MaxLength,
  MinLength,
  Matches,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LinkType } from '../../entities/note.entity';
import { IsNotSQLInjection, IsNotXSS } from '../../common/validators/custom-validators';

export class CreateNoteDto {
  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @ApiProperty({
    description: 'ID o código de la entidad a la que se vinculará la nota',
    example: 'TEST_EP',
  })
  linkId: string;

  @IsEnum(LinkType)
  @ApiProperty({
    description: 'Tipo de entidad a la que se vincula la nota',
    enum: LinkType,
    example: LinkType.PROJECT,
    enumName: 'LinkType',
  })
  linkType: LinkType;

  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @MinLength(1)
  @MaxLength(255)
  @ApiProperty({
    description: 'Asunto o título de la nota',
    example: 'Revisión de animación',
    minLength: 1,
    maxLength: 255,
  })
  subject: string;

  @IsString()
  @IsNotSQLInjection()
  @IsNotXSS()
  @MinLength(1)
  @MaxLength(5000)
  @ApiProperty({
    description: 'Contenido detallado de la nota',
    example:
      'La animación del personaje principal necesita ajustes en los frames 120-150 para mejorar la fluidez del movimiento',
    minLength: 1,
    maxLength: 5000,
  })
  content: string;



  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Marca si la nota ha sido leída',
    default: false,
    example: false,
  })
  isRead?: boolean;

  @IsOptional()
  @IsArray()
  @Matches(/^https?:\/\/.+/i, {
    each: true,
    message: 'each value in attachments must be a valid URL',
  })
  @ApiPropertyOptional({
    description: 'Lista de URLs de archivos adjuntos',
    type: [String],
    example: [
      'http://localhost:9000/attachments/2025/09/21/documento.pdf',
      'http://localhost:9000/attachments/2025/09/21/imagen.jpg',
    ],
    isArray: true,
  })
  attachments?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID del usuario al que se asigna la nota para su atención',
    example: 1,
    type: 'number',
  })
  assignedTo?: number;
}
