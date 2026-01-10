import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';
import { Project } from './project.entity';

/**
 * Project roles for fine-grained access control within projects
 */
export enum ProjectRole {
  OWNER = 'owner', // Full control: CRUD + manage permissions
  CONTRIBUTOR = 'contributor', // Create/edit content, cannot delete project
  VIEWER = 'viewer', // Read-only access
}

/**
 * ProjectPermission Entity - Links users to projects with specific roles
 *
 * This enables project-level access control that works alongside global roles:
 * - Admin users bypass project permissions (full access)
 * - Other users need explicit ProjectPermission to access a project
 *
 * Permission inheritance:
 * - Permissions granted at project level apply to all child entities
 * - Project -> Episode -> Sequence -> Shot
 */
@Entity('project_permissions')
@Index(['userId', 'projectId'], { unique: true }) // One permission per user per project
@Index(['projectId']) // Fast lookup of project members
@Index(['userId']) // Fast lookup of user's projects
export class ProjectPermission {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'Unique identifier for the project permission',
    example: 1,
    type: 'number',
  })
  id: number;

  @Column({ name: 'user_id', type: 'integer' })
  @ApiProperty({
    description: 'ID of the user granted this permission',
    example: 1,
    type: 'number',
  })
  userId: number;

  @Column({ name: 'project_id', type: 'integer' })
  @ApiProperty({
    description: 'ID of the project this permission applies to',
    example: 1,
    type: 'number',
  })
  projectId: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: ProjectRole.VIEWER,
  })
  @ApiProperty({
    description: 'Role within the project',
    enum: ProjectRole,
    example: ProjectRole.CONTRIBUTOR,
    default: ProjectRole.VIEWER,
  })
  role: ProjectRole;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({
    description: 'Date when the permission was granted',
    type: Date,
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
