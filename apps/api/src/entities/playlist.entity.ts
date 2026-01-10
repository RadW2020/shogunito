import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { Status } from './status.entity';

/**
 * Playlist Entity - Represents collections of versions for review
 *
 * Database Optimization:
 * - Indexes on foreign key (project_id) for JOIN performance
 * - Indexes on frequently filtered columns (status, assigned_to, created_by)
 * - Composite indexes for common query patterns
 * - Lazy loading on relationships to prevent N+1 queries
 */
@Entity('playlists')
@Index(['projectId']) // FK index for JOINs
@Index(['statusId']) // Filter by status
@Index(['assignedTo']) // User assignments
@Index(['createdBy']) // User-created queries
@Index(['createdAt']) // Date sorting
@Index(['projectId', 'statusId']) // Common filtered queries
export class Playlist {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'ID único de la playlist',
    example: 123,
    type: 'number',
  })
  id: number;

  @Column({ unique: true })
  @ApiProperty({
    description: 'Código único identificador de la playlist',
    example: 'PL',
    maxLength: 50,
  })
  code: string;

  @Column()
  @ApiProperty({
    description: 'Nombre descriptivo de la playlist',
    example: 'Review Semanal - Episodio 1',
    maxLength: 255,
  })
  name: string;

  @Column({ nullable: true })
  @ApiProperty({
    description: 'Descripción detallada del propósito de la playlist',
    example: 'Playlist para revisión semanal con el cliente - shots finalizados del episodio 1',
    nullable: true,
    required: false,
  })
  description?: string;

  /**
   * Foreign Key - Status relationship
   * Explicit column for query optimization and proper indexing
   */
  @Column({ name: 'status_id', type: 'uuid', nullable: true })
  @ApiProperty({
    description: 'ID del estado actual de la playlist en el proceso de revisión',
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

  @Column('simple-array', { name: 'version_codes', nullable: true })
  @ApiProperty({
    description: 'Lista de códigos de las versiones incluidas en esta playlist',
    type: [String],
    example: ['SH_003', 'SEQ_002', 'EP_001'],
    nullable: true,
    required: false,
  })
  versionCodes: string[];

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  @ApiProperty({
    description:
      'ID del usuario que creó la playlist (asignado automáticamente desde el usuario autenticado)',
    example: 1,
    type: 'number',
    nullable: true,
    required: false,
  })
  createdBy?: number;

  @Column({ name: 'assigned_to', type: 'integer', nullable: true })
  @ApiProperty({
    description: 'ID del usuario asignado para revisar la playlist',
    example: 1,
    type: 'number',
    nullable: true,
    required: false,
  })
  assignedTo?: number;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({
    description: 'Fecha y hora de creación de la playlist',
    type: Date,
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty({
    description: 'Fecha y hora de la última actualización de la playlist',
    type: Date,
    example: '2024-01-15T14:45:00Z',
  })
  updatedAt: Date;

  @Column({ name: 'status_updated_at', type: 'timestamp', nullable: true })
  @ApiProperty({
    description: 'Fecha y hora de la última actualización del estado de la playlist',
    type: Date,
    example: '2024-01-15T16:30:00Z',
    nullable: true,
    required: false,
  })
  statusUpdatedAt?: Date;

  /**
   * Foreign Key - Project relationship
   * Explicit column for query optimization and proper indexing
   */
  @Column({ name: 'project_id', type: 'integer' })
  @ApiProperty({
    description: 'ID del proyecto al que pertenece esta playlist',
    example: 123,
    type: 'number',
    required: true,
  })
  projectId: number;

  @ApiHideProperty()
  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  /**
   * Relationships - Using lazy loading to control query performance
   */
  @ApiHideProperty()
  @OneToMany('Note', 'playlist')
  notes?: any[];
}
