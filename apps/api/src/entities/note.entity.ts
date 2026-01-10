import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';

export enum LinkType {
  PROJECT = 'Project',
  EPISODE = 'Episode',
  ASSET = 'Asset',
  SEQUENCE = 'Sequence',
  VERSION = 'Version',
}

/**
 * Note Entity - Represents notes/comments attached to any entity
 *
 * Database Optimization:
 * - Composite index on link_id + link_type for polymorphic relationship queries
 * - Indexes on frequently filtered columns (is_read, assigned_to, created_by)
 * - Index on created_at for date sorting and filtering
 */
@Entity('notes')
@Index(['linkId', 'linkType']) // Polymorphic relationship queries
@Index(['isRead']) // Filter unread notes
@Index(['createdBy']) // User-created queries
@Index(['assignedTo']) // User assignments
@Index(['createdAt']) // Date sorting
@Index(['linkId', 'linkType', 'isRead']) // Common filtered queries
export class Note {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({
    description: 'Identificador único de la nota en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @Column({ name: 'link_id' })
  @ApiProperty({
    description: 'ID de la entidad a la que está vinculada esta nota',
    example: '987e6543-e21b-12d3-a456-426614174000',
  })
  linkId: string;

  @Column({
    type: 'enum',
    enum: LinkType,
  })
  @ApiHideProperty()
  linkType: LinkType;

  @Column()
  @ApiProperty({
    description: 'Asunto o título de la nota',
    example: 'Revisión de animación',
  })
  subject: string;

  @Column('text')
  @ApiProperty({
    description: 'Contenido detallado de la nota',
    example: 'La animación del personaje principal necesita ajustes en los frames 120-150',
  })
  content: string;

  @Column({ name: 'is_read', default: false })
  @ApiProperty({
    description: 'Indica si la nota ha sido leída',
    default: false,
    example: false,
  })
  isRead: boolean;

  @Column('simple-array', { nullable: true })
  @ApiProperty({
    description: 'Lista de URLs de archivos adjuntos asociados a la nota',
    type: [String],
    nullable: true,
    example: [
      'https://storage.ejemplo.com/archivo1.pdf',
      'https://storage.ejemplo.com/imagen1.png',
    ],
  })
  attachments?: string[];

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  @ApiProperty({
    description:
      'ID del usuario que creó la nota (asignado automáticamente desde el usuario autenticado)',
    nullable: true,
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @Column({ name: 'assigned_to', type: 'integer', nullable: true })
  @ApiProperty({
    description: 'ID del usuario al que se asigna la nota',
    nullable: true,
    example: 1,
    type: 'number',
  })
  assignedTo?: number;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({
    description: 'Fecha y hora de creación de la nota',
    type: Date,
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty({
    description: 'Fecha y hora de la última actualización de la nota',
    type: Date,
    example: '2024-01-15T14:45:00Z',
  })
  updatedAt: Date;
}
