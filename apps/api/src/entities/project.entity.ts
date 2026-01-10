import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { Status } from './status.entity';

/**
 * Project Entity - Root entity for production pipeline
 *
 * Database Optimization:
 * - Indexes on frequently queried columns (status_id, created_by, created_at)
 * - Composite index for common filtered queries (status_id + created_at)
 * - Relationships loaded explicitly when needed to avoid N+1 queries
 */
@Entity('projects')
@Index(['statusId']) // Filter by project status
@Index(['createdBy']) // User-specific queries
@Index(['createdAt']) // Date sorting
@Index(['statusId', 'createdAt']) // Common filtered date range queries
export class Project {
  @ApiProperty({
    description: 'Identificador único del proyecto (auto-increment)',
    example: 123,
    type: 'number',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Código único del proyecto para identificación interna',
    example: 'PROJ_001',
    type: 'string',
    uniqueItems: true,
  })
  @Column({ unique: true })
  code: string;

  @ApiProperty({
    description: 'Nombre descriptivo del proyecto',
    example: 'Serie Animada Temporada 1',
    type: 'string',
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'Descripción detallada del proyecto, objetivos y alcance',
    example: 'Producción de 12 episodios para serie animada dirigida a público infantil',
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
    description: 'ID del estado actual del proyecto en el proceso de producción',
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
    description: 'Nombre del cliente para el cual se desarrolla el proyecto',
    example: 'Netflix Studios',
    type: 'string',
    required: false,
  })
  @Column({ name: 'client_name', nullable: true })
  clientName?: string;

  @ApiProperty({
    description: 'Fecha de inicio del proyecto en formato ISO',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
    required: false,
  })
  @Column({ name: 'start_date', nullable: true })
  startDate?: string;

  @ApiProperty({
    description: 'Fecha estimada de finalización del proyecto en formato ISO',
    example: '2024-12-15',
    type: 'string',
    format: 'date',
    required: false,
  })
  @Column({ name: 'end_date', nullable: true })
  endDate?: string;

  @ApiProperty({
    description:
      'ID del usuario que creó el proyecto (asignado automáticamente desde el usuario autenticado)',
    example: 1,
    type: 'number',
    required: false,
    nullable: true,
  })
  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy?: number;

  @ApiProperty({
    description: 'Fecha y hora de creación del proyecto',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha y hora de la última actualización del proyecto',
    example: '2024-01-20T15:45:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Relationships - Loaded explicitly when needed using relations or leftJoinAndSelect
   *
   * Usage:
   * @example
   * const project = await repository.findOne({
   *   where: { id },
   *   relations: ['episodes', 'assets'] // Explicitly load when needed
   * });
   */
  @ApiProperty({
    description: 'Episodios asociados al proyecto',
    type: 'array',
    required: false,
  })
  @OneToMany('Episode', 'project')
  episodes?: any[];

  @ApiProperty({
    description: 'Assets asociados al proyecto',
    type: 'array',
    required: false,
  })
  @OneToMany('Asset', 'project')
  assets?: any[];

  @ApiHideProperty()
  @OneToMany('Note', 'project')
  notes?: any[];
}
