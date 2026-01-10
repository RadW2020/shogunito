import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Entidad para almacenar refresh tokens con soporte para rotación y detección de replay attacks
 *
 * Token Family Pattern:
 * - Cada familia de tokens tiene un ID único (tokenFamily)
 * - Cuando un token se rota, el nuevo token pertenece a la misma familia
 * - Si se detecta el uso de un token ya usado (isRevoked=true), se invalidan TODOS los tokens de esa familia
 */
@Entity('refresh_tokens')
@Index(['userId', 'isRevoked'])
@Index(['tokenFamily', 'isRevoked'])
@Index(['jti'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * JWT ID - Identificador único del token
   */
  @Column({ unique: true })
  jti: string;

  /**
   * Token family ID - Agrupa tokens que han sido rotados
   * Todos los tokens de una misma sesión comparten el mismo tokenFamily
   */
  @Column({ name: 'token_family' })
  tokenFamily: string;

  /**
   * Hash del refresh token
   */
  @Column({ name: 'token_hash' })
  tokenHash: string;

  /**
   * Usuario propietario del token
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  /**
   * Indica si el token ha sido revocado/invalidado
   * true = token ya no es válido
   */
  @Column({ default: false, name: 'is_revoked' })
  isRevoked: boolean;

  /**
   * Indica si el token ha sido usado para generar un nuevo token
   * true = token ya fue usado en una rotación
   */
  @Column({ default: false, name: 'is_used' })
  isUsed: boolean;

  /**
   * Fecha de expiración del token
   */
  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  /**
   * IP address del cliente que generó el token
   */
  @Column({ nullable: true, name: 'ip_address' })
  ipAddress?: string;

  /**
   * User agent del cliente que generó el token
   */
  @Column({ nullable: true, name: 'user_agent' })
  userAgent?: string;

  /**
   * Timestamp de cuando el token fue usado por última vez
   */
  @Column({ nullable: true, type: 'timestamp', name: 'last_used_at' })
  lastUsedAt?: Date;

  /**
   * JTI del token que reemplazó a este (para tracking de la cadena)
   */
  @Column({ nullable: true, name: 'replaced_by_jti' })
  replacedByJti?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Verifica si el token está activo (no revocado, no usado, no expirado)
   */
  isActive(): boolean {
    return !this.isRevoked && !this.isUsed && new Date() < new Date(this.expiresAt);
  }

  /**
   * Verifica si el token ha expirado
   */
  isExpired(): boolean {
    return new Date() >= new Date(this.expiresAt);
  }
}
