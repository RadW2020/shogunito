import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
      select: ['id', 'email', 'name', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'name', 'passwordHash', 'role', 'isActive'],
    });
  }

  async create(userData: Partial<User>, createdBy?: number | null): Promise<User> {
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Validar que se proporcione una contraseña
    if (!userData.password && !userData.passwordHash) {
      throw new ConflictException('Password is required');
    }

    // Crear el usuario
    const user = this.userRepository.create(userData);

    // Asignar explícitamente el password al objeto para que el hook @BeforeInsert() lo procese
    // Esto es necesario porque TypeORM puede no asignar propiedades sin @Column decorator
    if (userData.password) {
      user.password = userData.password;
    }

    const savedUser = await this.userRepository.save(user);

    // Send notifications if an admin user was created
    if (savedUser.role === 'admin') {
      // const creator = createdBy ? String(createdBy) : 'System';
      // Slack notification removed
    }

    return savedUser;
  }

  async update(id: number, userData: Partial<User>, changedBy?: number | null): Promise<User> {
    // Get full user for update (including passwordHash for password updates)
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (userData.email && userData.email !== user.email) {
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictException('El email ya está en uso');
      }
    }

    // Check if username is being updated and if it conflicts
    if (userData.name && userData.name !== user.name) {
      // Check for duplicate username if username field exists
      // Note: Currently User entity doesn't have a unique username field
      // This is a placeholder for future username uniqueness validation
    }

    // Check if role is changing
    const isRoleChanging = userData.role && userData.role !== user.role;
    const oldRole = user.role;

    Object.assign(user, userData);
    const updatedUser = await this.userRepository.save(user);

    // Send notifications if role/permissions changed
    if (isRoleChanging) {
      // const modifier = changedBy ? String(changedBy) : 'System';
      // Slack notification removed
    }

    // Explicitly delete password field if it exists (should be deleted by hook, but ensure it)
    if (updatedUser.password) {
      delete updatedUser.password;
    }

    // Return user without sensitive fields
    return this.findOne(id);
  }

  async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
    const hashedRefreshToken = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
    return { message: 'Usuario eliminado exitosamente' };
  }

  /**
   * Actualizar token de recuperación de contraseña
   */
  async updatePasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await this.userRepository.update(userId, {
      passwordResetToken: token,
      passwordResetExpiresAt: expiresAt,
    });
  }

  /**
   * Buscar usuario por token de recuperación válido
   */
  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.passwordResetToken = :token', { token })
      .andWhere('user.passwordResetExpiresAt > :now', { now: new Date() })
      .getOne();
  }

  /**
   * Resetear contraseña y limpiar token
   */
  async resetPassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.findOne(userId);

    // Asignar nueva contraseña (será hasheada por el hook @BeforeUpdate)
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    user.refreshToken = null; // Invalidar refresh tokens existentes

    await this.userRepository.save(user);
  }

  /**
   * Limpiar token de recuperación
   */
  async clearPasswordResetToken(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });
  }
}
