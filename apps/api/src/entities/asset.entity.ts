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
import { AssetType } from '@shogunito/shared';
import { Status } from './status.entity';

/**
 * Asset Entity - Represents reusable assets (characters, props, environments, etc.)
 *
 * Database Optimization:
 * - Indexes on foreign key (project_id) for JOIN performance
 * - Indexes on frequently filtered columns (status, asset_type, assigned_to, created_by)
 * - Composite indexes for common query patterns
 * - Lazy loading on relationships to prevent N+1 queries
 */
@Entity('assets')
@Index(['projectId']) // FK index for JOINs
@Index(['statusId']) // Filter by status
@Index(['assetType']) // Filter by asset type
@Index(['assignedTo']) // User assignments
@Index(['createdBy']) // User-created queries
@Index(['createdAt']) // Date sorting
@Index(['projectId', 'statusId']) // Common filtered queries
@Index(['projectId', 'assetType']) // Assets by type within project
export class Asset {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'ID único del asset',
    example: 123,
    type: 'number',
  })
  id: number;

  @Column({ unique: true })
  @ApiProperty({
    description: 'Código único identificador del asset',
    example: 'CHAR',
    maxLength: 50,
  })
  code: string;

  @Column()
  @ApiProperty({
    description: 'Nombre descriptivo del asset',
    example: 'Personaje Principal',
    maxLength: 255,
  })
  name: string;

  @Column({
    type: 'enum',
    enum: AssetType,
    default: AssetType.TXT,
  })
  @ApiProperty({
    description:
      'Tipo de asset. Valores: prompt, txt, json, subtitulos_ingles, subtitulos_espanol, director_script, audio_original, audio_caricaturizado_ingles, audio_caricaturizado_espanol',
    enum: AssetType,
    default: AssetType.TXT,
    example: AssetType.PROMPT,
    enumName: 'AssetType',
  })
  assetType: AssetType;

  /**
   * Foreign Key - Status relationship
   * Explicit column for query optimization and proper indexing
   */
  @Column({ name: 'status_id', type: 'uuid', nullable: true })
  @ApiProperty({
    description: 'ID del estado actual del asset en el pipeline de producción',
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

  @Column({ nullable: true })
  @ApiProperty({
    description: 'Descripción detallada del asset',
    example: 'Modelo 3D del personaje principal con rig completo',
    nullable: true,
    required: false,
  })
  description?: string;

  @Column({ name: 'thumbnail_path', nullable: true })
  @ApiProperty({
    description: 'Ruta al archivo de thumbnail del asset',
    example: '/uploads/thumbnails/asset_123.jpg',
    nullable: true,
    required: false,
  })
  thumbnailPath?: string;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  @ApiProperty({
    description:
      'ID del usuario que creó el asset (asignado automáticamente desde el usuario autenticado)',
    example: 1,
    type: 'number',
    nullable: true,
    required: false,
  })
  createdBy?: number;

  @Column({ name: 'assigned_to', type: 'integer', nullable: true })
  @ApiProperty({
    description: 'ID del usuario asignado para trabajar en el asset',
    example: 1,
    type: 'number',
    nullable: true,
    required: false,
  })
  assignedTo?: number;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({
    description: 'Fecha y hora de creación del asset',
    type: Date,
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty({
    description: 'Fecha y hora de la última actualización del asset',
    type: Date,
    example: '2024-01-15T14:45:00Z',
  })
  updatedAt: Date;

  /**
   * Foreign Key - Project relationship
   * Explicit column for query optimization and proper indexing
   */
  @Column({ name: 'project_id', type: 'integer' })
  @ApiProperty({
    description: 'ID del proyecto al que pertenece este asset',
    example: 123,
    type: 'number',
    required: true,
  })
  projectId: number;

  @ApiHideProperty()
  @ManyToOne('Project', 'assets', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project?: any;

  /**
   * Relationships - Using lazy loading to control query performance
   */
  @ApiHideProperty()
  @OneToMany('Note', 'asset')
  notes?: any[];
}
