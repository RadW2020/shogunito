import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import type { Episode } from './episode.entity';
import { Status } from './status.entity';

/**
 * Sequence Entity - Represents sequences within episodes
 *
 * Database Optimization:
 * - Indexes on foreign key (episode_id) for JOIN performance
 * - Indexes on frequently filtered columns (status, assigned_to, created_by)
 * - Composite indexes for common queries
 * - Lazy loading on relationships to prevent N+1 queries
 */
@Entity('sequences')
@Index(['episodeId']) // FK index for JOINs
@Index(['statusId']) // Filter by status
@Index(['assignedTo']) // User assignments
@Index(['createdBy']) // User-created queries
@Index(['episodeId', 'statusId']) // Common filtered queries
@Index(['episodeId', 'cutOrder']) // Ordering within episode
export class Sequence {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'ID único de la secuencia',
    example: 123,
    type: 'number',
  })
  id: number;

  @Column({ unique: true })
  @ApiProperty({
    description: 'Código único de la secuencia para identificación interna',
    example: 'SEQ',
    type: 'string',
  })
  code: string;

  @ApiProperty({
    description: 'Nombre descriptivo de la secuencia',
    example: 'Escena del Bosque Encantado',
    type: 'string',
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'Descripción detallada de la secuencia, eventos y contenido narrativo',
    example:
      'Los protagonistas se adentran en el bosque mágico donde encuentran criaturas fantásticas',
    type: 'string',
    required: false,
  })
  @Column({ nullable: true })
  description?: string;

  @ApiProperty({
    description: 'Orden de la secuencia en el montaje final del episodio',
    example: 5,
    type: 'number',
    minimum: 1,
  })
  @Column({ name: 'cut_order' })
  cutOrder: number;

  /**
   * Foreign Key - Status relationship
   * Explicit column for query optimization and proper indexing
   */
  @Column({ name: 'status_id', type: 'uuid', nullable: true })
  @ApiProperty({
    description: 'ID del estado actual de la secuencia en el proceso de producción',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    nullable: true,
  })
  statusId?: string;

  @ApiHideProperty()
  @ManyToOne('Status', {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'status_id' })
  status?: Status;



  @ApiProperty({
    description: 'Identificador de la historia o guión asociado',
    example: 'STORY_EP01_001',
    type: 'string',
    required: false,
  })
  @Column({ name: 'story_id', nullable: true })
  storyId?: string;

  @ApiProperty({
    description:
      'ID del usuario que creó la secuencia (asignado automáticamente desde el usuario autenticado)',
    example: 1,
    type: 'number',
    required: false,
    nullable: true,
  })
  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy?: number;

  @ApiProperty({
    description: 'Usuario asignado como responsable de la secuencia',
    example: 'animator@studio.com',
    type: 'string',
    required: false,
  })
  @Column({ name: 'assigned_to', type: 'integer', nullable: true })
  assignedTo?: number;

  @ApiProperty({
    description: 'Fecha y hora de creación de la secuencia',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha y hora de la última actualización de la secuencia',
    example: '2024-01-20T15:45:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Foreign Key - Episode relationship
   * Explicit column for query optimization and proper indexing
   */
  @Column({ name: 'episode_id', type: 'integer' })
  @ApiProperty({
    description: 'ID del episodio al que pertenece esta secuencia',
    example: 123,
    type: 'number',
    required: true,
  })
  episodeId: number;

  @ApiHideProperty()
  @ManyToOne('Episode', (episode: Episode) => episode.sequences, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;
}
