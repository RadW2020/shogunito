import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export type ApplicableEntity =
  | 'project'
  | 'playlist'
  | 'episode'
  | 'sequence'
  | 'shot'
  | 'version'
  | 'asset'
  | 'note';

@Entity('statuses')
export class Status {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({
    description: 'Identificador único del estado en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @Column({ unique: true })
  @ApiProperty({
    description: 'Código único identificador del estado',
    example: 'IN_PROGRESS',
    maxLength: 50,
    uniqueItems: true,
  })
  code: string;

  @Column()
  @ApiProperty({
    description: 'Nombre descriptivo del estado',
    example: 'En Progreso',
    maxLength: 255,
  })
  name: string;

  @Column({ nullable: true })
  @ApiProperty({
    description: 'Descripción detallada del estado y su propósito',
    example: 'El elemento está siendo trabajado activamente por el equipo',
    nullable: true,
    required: false,
  })
  description?: string;

  @Column()
  @ApiProperty({
    description: 'Color hexadecimal para representar visualmente el estado',
    example: '#FFA500',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  color: string;

  @Column({ name: 'is_active', default: true })
  @ApiProperty({
    description: 'Indica si el estado está activo y disponible para usar',
    example: true,
    default: true,
  })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  @ApiProperty({
    description: 'Orden de clasificación para mostrar los estados',
    example: 10,
    default: 0,
    minimum: 0,
  })
  sortOrder: number;

  @Column('text', { array: true, name: 'applicable_entities' })
  @ApiProperty({
    description:
      'Lista de entidades a las que se puede aplicar este estado. Si incluye "all", aplica a todas las entidades',
    type: [String],
    example: ['project', 'shot', 'asset'],
    enum: ['project', 'episode', 'sequence', 'shot', 'version', 'asset', 'note', 'all'],
  })
  applicableEntities: (ApplicableEntity | 'all')[];

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  @ApiProperty({
    description:
      'ID del usuario que creó el estado (asignado automáticamente desde el usuario autenticado)',
    example: 1,
    type: 'number',
    nullable: true,
    required: false,
  })
  createdBy?: number;

  @Column({ name: 'assigned_to', type: 'integer', nullable: true })
  @ApiProperty({
    description: 'ID del usuario responsable de mantener este estado',
    example: 1,
    type: 'number',
    nullable: true,
    required: false,
  })
  assignedTo?: number;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({
    description: 'Fecha y hora de creación del estado',
    type: Date,
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty({
    description: 'Fecha y hora de la última actualización del estado',
    type: Date,
    example: '2024-01-15T14:45:00Z',
  })
  updatedAt: Date;
}
