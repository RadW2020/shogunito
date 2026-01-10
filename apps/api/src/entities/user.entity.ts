import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';

/**
 * User Entity - Represents system users with authentication and authorization
 *
 * Database Optimization:
 * - Index on role for permission/role-based queries
 * - Index on is_active for filtering active users
 * - email already has unique constraint which creates an index automatically
 */
@Entity('users')
@Index(['role']) // Role-based queries
@Index(['isActive']) // Filter active/inactive users
export class User {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'Identificador único del usuario (integer)',
    example: 1,
    type: 'number',
  })
  id: number;

  @Column({ unique: true })
  @ApiProperty({
    description: 'Dirección de correo electrónico única del usuario',
    example: 'usuario@ejemplo.com',
    uniqueItems: true,
  })
  email: string;

  @Column()
  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
  })
  name: string;

  @Column({ name: 'password_hash' })
  @ApiHideProperty()
  @Exclude()
  passwordHash: string;

  @Column({ default: 'member' })
  @ApiProperty({
    description: 'Rol del usuario en el sistema',
    enum: ['admin', 'member'],
    example: 'member',
    default: 'member',
  })
  role: 'admin' | 'member';

  @Column({ nullable: true })
  @ApiHideProperty()
  @Exclude()
  refreshToken?: string;

  @Column({ default: true })
  @ApiProperty({
    description: 'Estado de activación del usuario',
    example: true,
  })
  isActive: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  @ApiProperty({
    description: 'Fecha del último inicio de sesión',
    type: Date,
    nullable: true,
  })
  lastLoginAt?: Date;

  @Column({ nullable: true, name: 'password_reset_token' })
  @ApiHideProperty()
  @Exclude()
  passwordResetToken?: string;

  @Column({
    nullable: true,
    type: 'timestamp',
    name: 'password_reset_expires_at',
  })
  @ApiHideProperty()
  @Exclude()
  passwordResetExpiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({
    description: 'Fecha y hora de creación del registro',
    type: Date,
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty({
    description: 'Fecha y hora de la última actualización del registro',
    type: Date,
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt: Date;

  // Método temporal para la contraseña sin hash (no se guarda en DB)
  password?: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Solo hashear si se proporciona una nueva contraseña
    if (this.password) {
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this.password, salt);
      delete this.password;
    } else if (!this.passwordHash && this.id === undefined) {
      // Si es una inserción nueva y no hay password ni passwordHash, lanzar error
      throw new Error('Password is required when creating a new user');
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }
}
