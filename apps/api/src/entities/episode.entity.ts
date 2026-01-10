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
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import type { Sequence } from './sequence.entity';
import { Status } from './status.entity';

/**
 * Episode Entity - Represents episodes within projects
 *
 * Database Optimization:
 * - Indexes on foreign key (project_id) for JOIN performance
 * - Indexes on frequently filtered columns (status, assigned_to, created_by)
 * - Composite index for common queries (project_id + status)
 * - Lazy loading on relationships to control query performance
 */
@Entity('episodes')
@Index(['projectId']) // FK index for JOINs
@Index(['statusId']) // Filter by status
@Index(['assignedTo']) // User assignments
@Index(['createdBy']) // User-created queries
@Index(['projectId', 'statusId']) // Common filtered queries by project
@Index(['projectId', 'epNumber']) // Episode ordering within project
@Index(['projectId', 'cutOrder']) // Ordering within project
export class Episode {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'ID único del episodio',
    example: 123,
    type: 'number',
  })
  id: number;

  @Column({ unique: true })
  @ApiProperty({
    description: 'Código único identificador del episodio',
    example: 'EP',
    maxLength: 50,
  })
  code: string;

  @ApiProperty({
    description: 'Número del episodio en la serie',
    example: 1,
    type: 'number',
    required: false,
  })
  @Column({ name: 'ep_number', nullable: true })
  epNumber?: number;

  @ApiProperty({
    description: 'Orden del episodio en el montaje final del proyecto',
    example: 5,
    type: 'number',
    minimum: 1,
  })
  @Column({ name: 'cut_order' })
  cutOrder: number;

  @ApiProperty({
    description: 'Nombre descriptivo del episodio',
    example: 'El Inicio de la Aventura',
    type: 'string',
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'Descripción detallada del episodio, sinopsis y contenido',
    example: 'Primer episodio donde los protagonistas se conocen y comienza su aventura épica',
    type: 'string',
    required: false,
  })
  @Column({ nullable: true })
  description?: string;

  /**
   * Foreign Key - Status relationship
   * Explicit column for query optimization and proper indexing
   */
  @Column({ name: 'status_id', type: 'uuid', nullable: true })
  @ApiProperty({
    description: 'ID del estado actual del episodio en el proceso de producción',
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
    description: 'Duración del episodio en segundos',
    example: 1440,
    type: 'number',
    required: false,
  })
  @Column({ nullable: true })
  duration?: number;

  @ApiProperty({
    description:
      'ID del usuario que creó el episodio (asignado automáticamente desde el usuario autenticado)',
    example: 1,
    type: 'number',
    required: false,
    nullable: true,
  })
  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy?: number;

  @ApiProperty({
    description: 'Usuario asignado como responsable del episodio',
    example: 'animator@studio.com',
    type: 'string',
    required: false,
  })
  @Column({ name: 'assigned_to', type: 'integer', nullable: true })
  assignedTo?: number;

  @ApiProperty({
    description: 'Fecha y hora de creación del episodio',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha y hora de la última actualización del episodio',
    example: '2024-01-20T15:45:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Foreign Key - Project relationship
   * Explicit column for query optimization and proper indexing
   */
  @Column({ name: 'project_id', type: 'integer' })
  @ApiProperty({
    description: 'ID del proyecto al que pertenece este episodio',
    example: 123,
    type: 'number',
    required: true,
  })
  projectId: number;

  @ApiHideProperty()
  @ManyToOne('Project', 'episodes', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project?: any;

  /**
   * Relationships - Using lazy loading to control query performance
   */
  @ApiHideProperty()
  @OneToMany('Sequence', (sequence: Sequence) => sequence.episode)
  sequences: Sequence[];
}
