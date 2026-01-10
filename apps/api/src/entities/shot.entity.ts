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
import type { Sequence } from './sequence.entity';
import { Status } from './status.entity';

export enum ShotType {
  ESTABLISHING = 'establishing',
  MEDIUM = 'medium',
  CLOSEUP = 'closeup',
  DETAIL = 'detail',
}

/**
 * Shot Entity - Represents individual shots within sequences
 *
 * Database Optimization:
 * - Indexes on foreign key (sequence_id) for JOIN performance
 * - Indexes on frequently filtered columns (status, assigned_to, created_by)
 * - Composite indexes for common query patterns
 * - Lazy loading on relationships to prevent N+1 queries
 */
@Entity('shots')
@Index(['sequenceId']) // FK index for JOINs
@Index(['statusId']) // Filter by status
@Index(['assignedTo']) // User assignments
@Index(['createdBy']) // User-created queries
@Index(['createdAt']) // Date sorting
@Index(['sequenceId', 'statusId']) // Common filtered queries
@Index(['sequenceId', 'cutOrder']) // Ordering within sequence
export class Shot {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'ID único del shot',
    example: 123,
    type: 'number',
  })
  id: number;

  @Column({ unique: true })
  @ApiProperty({
    description: 'Código único del shot para identificación rápida',
    example: 'SH',
  })
  code: string;

  @Column()
  @ApiProperty({
    description: 'Nombre descriptivo del shot',
    example: 'Plano general del edificio',
  })
  name: string;

  @Column({ nullable: true })
  @ApiProperty({
    description: 'Descripción detallada del contenido y propósito del shot',
    example: 'Plano general que establece la ubicación principal de la escena',
    nullable: true,
  })
  description?: string;

  @Column({ name: 'sequence_number' })
  @ApiProperty({
    description: 'Número de orden del shot dentro de la secuencia',
    example: 10,
    minimum: 1,
  })
  sequenceNumber: number;

  /**
   * Foreign Key - Status relationship
   * Explicit column for query optimization and proper indexing
   */
  @Column({ name: 'status_id', type: 'uuid', nullable: true })
  @ApiProperty({
    description: 'ID del estado actual del shot en el pipeline de producción',
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

  @Column({
    type: 'enum',
    enum: ShotType,
    nullable: true,
  })
  @ApiProperty({
    description: 'Tipo de shot según el encuadre o composición',
    enum: ShotType,
    nullable: true,
    example: ShotType.CLOSEUP,
  })
  shotType?: ShotType;

  @Column({ nullable: true })
  @ApiProperty({
    description: 'Duración del shot en frames',
    example: 120,
    nullable: true,
  })
  duration?: number;

  @Column({ name: 'cut_order', nullable: true })
  @ApiProperty({
    description: 'Orden del shot en el corte final de la secuencia',
    example: 5,
    nullable: true,
  })
  cutOrder?: number;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  @ApiProperty({
    description:
      'ID del usuario que creó el shot (asignado automáticamente desde el usuario autenticado)',
    nullable: true,
    example: 1,
    type: 'number',
  })
  createdBy?: number;

  @Column({ name: 'assigned_to', type: 'integer', nullable: true })
  @ApiProperty({
    description: 'ID del usuario asignado para trabajar en el shot',
    nullable: true,
    example: 1,
    type: 'number',
  })
  assignedTo?: number;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({
    description: 'Fecha y hora de creación del shot',
    type: Date,
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty({
    description: 'Fecha y hora de la última actualización del shot',
    type: Date,
    example: '2024-01-15T14:45:00Z',
  })
  updatedAt: Date;

  /**
   * Foreign Key - Sequence relationship
   * Explicit column for query optimization and proper indexing
   */
  @Column({ name: 'sequence_id', type: 'integer' })
  @ApiProperty({
    description: 'ID de la secuencia a la que pertenece este shot',
    example: 456,
    type: 'number',
    required: true,
  })
  sequenceId: number;

  @ApiHideProperty()
  @ManyToOne('Sequence', (sequence: Sequence) => sequence.shots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sequence_id' })
  sequence: Sequence;
}
