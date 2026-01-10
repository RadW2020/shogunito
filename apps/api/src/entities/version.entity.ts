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
import { Status } from './status.entity';

export enum VersionStatus {
  WIP = 'wip',
  REVIEW = 'review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Version Entity - Represents different versions of entities in the system
 *
 * Database Optimization:
 * - Indexes on entity_code and entity_type for polymorphic relationship queries
 * - Indexes on frequently filtered columns (status, latest, created_by, assigned_to)
 * - Index on created_at for date sorting and filtering
 * - Composite index for common queries (entity_code + entity_type)
 * - Lazy loading on relationships to prevent N+1 queries
 */
@Entity('versions')
@Index(['entityCode']) // Entity relationship queries
@Index(['entityType']) // Entity type filtering
@Index(['statusId']) // Filter by status
@Index(['latest']) // Query for latest versions
@Index(['createdBy']) // User-created queries
@Index(['assignedTo']) // User assignments
@Index(['createdAt']) // Date sorting
@Index(['entityCode', 'entityType']) // Polymorphic relationship queries (backward compatibility)
@Index(['entityId', 'entityType']) // Polymorphic relationship queries (new)
@Index(['entityCode', 'latest']) // Get latest version of entity (backward compatibility)
@Index(['entityId', 'latest']) // Get latest version of entity (new)
export class Version {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'ID único de la versión',
    example: 123,
    type: 'number',
  })
  id: number;

  @Column({ unique: true })
  @ApiProperty({
    description: 'Código único identificador de la versión',
    example: 'SH_003',
    maxLength: 50,
  })
  code: string;

  /**
   * Foreign Key - Status relationship
   * Explicit column for query optimization and proper indexing
   */
  @Column({ name: 'status_id', type: 'uuid', nullable: true })
  @ApiProperty({
    description: 'ID del estado actual de la versión en el pipeline de aprobación',
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

  @Column()
  @ApiProperty({
    description: 'Nombre descriptivo de la versión',
    example: 'Versión Final con Corrección de Luces',
    maxLength: 255,
  })
  name: string;

  @Column({ nullable: true })
  @ApiProperty({
    description: 'Descripción detallada de los cambios en esta versión',
    example: 'Corrección de timing en la animación facial y ajuste de luces ambientales',
    nullable: true,
    required: false,
  })
  description?: string;

  @Column({ name: 'file_path', nullable: true })
  @ApiProperty({
    description:
      'URL pública del archivo principal de la versión. Soporta múltiples tipos de contenido: videos (MP4, MOV, AVI, WEBM), imágenes (PNG, JPG, WEBP, EXR) y archivos de texto (TXT, MD, JSON). Puede ser una ruta relativa o URL completa. Se actualiza automáticamente al subir archivo con POST /versions/:id/file. El tipo de contenido se detecta por extensión del archivo.',
    example: 'https://storage.example.com/media/2025/12/08/version_123.mp4',
    nullable: true,
    required: false,
  })
  filePath?: string;

  @Column({ name: 'thumbnail_path', nullable: true })
  @ApiProperty({
    description:
      'URL pública de la imagen thumbnail (miniatura) de la versión. Formato: JPG, PNG o WebP. Tamaño recomendado: 640x360px, máximo 5MB. Se usa para preview rápido en grids de versiones sin cargar el archivo completo. Se actualiza al subir thumbnail con POST /versions/:id/thumbnail.',
    example: 'https://storage.example.com/thumbnails/2025/12/08/version_123_thumb.jpg',
    nullable: true,
    required: false,
  })
  thumbnailPath?: string;

  @Column({ nullable: true })
  @ApiProperty({
    description: 'Nombre del artista que creó esta versión',
    example: 'Juan Pérez',
    nullable: true,
    required: false,
  })
  artist?: string;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  @ApiProperty({
    description:
      'ID del usuario que creó la versión (asignado automáticamente desde el usuario autenticado)',
    example: 1,
    type: 'number',
    nullable: true,
    required: false,
  })
  createdBy?: number;

  @Column({ name: 'assigned_to', type: 'integer', nullable: true })
  @ApiProperty({
    description: 'ID del usuario asignado para revisar esta versión',
    example: 1,
    type: 'number',
    nullable: true,
    required: false,
  })
  assignedTo?: number;

  @Column({ nullable: true })
  @ApiProperty({
    description:
      'Formato del contenido de la versión. Para videos: aspect ratio (16:9, 9:16, 1:1) o codec (MP4, MOV). Para imágenes: formato de archivo (PNG, JPG, EXR) o dimensiones. Para texto: tipo de archivo (TXT, MD, JSON). Campo libre para flexibilidad según tipo de contenido.',
    example: '16:9',
    nullable: true,
    required: false,
  })
  format?: string;

  @Column({ name: 'frame_range', nullable: true })
  @ApiProperty({
    description: 'Rango de frames de la versión',
    example: '1001-1120',
    nullable: true,
    required: false,
  })
  frameRange?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @ApiProperty({
    description: 'Duración del video en segundos',
    example: 120.5,
    nullable: true,
    required: false,
  })
  duration?: number;

  @Column({ default: false })
  @ApiProperty({
    description:
      'Indica si esta es la versión más reciente de la entidad asociada. Solo una versión por entidad puede tener latest=true.',
    example: true,
    default: false,
  })
  latest: boolean;

  @Column({ name: 'version_number', default: 1 })
  @ApiProperty({
    description: 'Número secuencial de la versión',
    example: 3,
    default: 1,
    minimum: 1,
  })
  versionNumber: number;

  @ApiProperty({
    description:
      'Indica si esta es la versión más reciente de la entidad asociada (shot, asset, playlist, sequence). Solo una versión por entidad puede tener latest=true. Se actualiza automáticamente al crear nuevas versiones: la nueva se marca como latest=true y las anteriores como latest=false. Útil para filtrar versiones actuales con GET /versions?latest=true.',
    example: true,
    default: false,
  })
  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({
    description: 'Fecha y hora de creación de la versión',
    type: Date,
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty({
    description: 'Fecha y hora de la última actualización de la versión',
    type: Date,
    example: '2024-01-15T14:45:00Z',
  })
  updatedAt: Date;

  @Column({ name: 'status_updated_at', nullable: true })
  @ApiProperty({
    description: 'Fecha y hora de la última actualización del status',
    type: Date,
    example: '2024-01-15T14:45:00Z',
    nullable: true,
    required: false,
  })
  statusUpdatedAt?: Date;

  @Column({ name: 'entity_code', nullable: true })
  @ApiProperty({
    description:
      'Código de la entidad asociada (backward compatibility - usar entityId para entidades migradas)',
    example: 'SH',
    nullable: true,
    required: false,
  })
  entityCode?: string;

  @Column({ name: 'entity_id', type: 'integer', nullable: true })
  @ApiProperty({
    description:
      'ID de la entidad asociada (para entidades migradas: shot, asset, sequence, playlist)',
    example: 123,
    nullable: true,
    required: false,
    type: 'number',
  })
  entityId?: number;

  @Column({ name: 'entity_type', nullable: true })
  @ApiProperty({
    description: 'Tipo de entidad asociada',
    example: 'shot',
    nullable: true,
    required: false,
  })
  entityType?: string;

  /**
   * Relationships - Using lazy loading to control query performance
   */
  @ApiHideProperty()
  @OneToMany('Note', 'version')
  notes?: any[];
}
