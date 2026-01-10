import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Crea un nuevo refresh token con una familia de tokens
   */
  async createRefreshToken(
    userId: number,
    token: string,
    jti: string,
    tokenFamily: string,
    expiresIn: number, // en segundos
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshToken> {
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const refreshToken = this.refreshTokenRepository.create({
      userId,
      jti,
      tokenFamily,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  /**
   * Valida un refresh token y detecta replay attacks
   * Retorna el token si es válido, o lanza excepción si hay problemas
   */
  async validateRefreshToken(jti: string, token: string): Promise<RefreshToken> {
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { jti },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Token inválido');
    }

    // Verificar si el token ha expirado
    if (storedToken.isExpired()) {
      throw new UnauthorizedException('Token expirado');
    }

    // DETECCIÓN DE REPLAY ATTACK
    // Si el token ya fue usado, significa que alguien está intentando reutilizar un token viejo
    if (storedToken.isUsed) {
      // ¡REPLAY ATTACK DETECTADO!
      // Invalidar toda la familia de tokens como medida de seguridad
      await this.revokeTokenFamily(storedToken.tokenFamily, storedToken.userId);

      throw new ForbiddenException(
        'Replay attack detectado. Todos los tokens de esta sesión han sido invalidados. Por favor, inicia sesión nuevamente.',
      );
    }

    // Verificar si el token está revocado
    if (storedToken.isRevoked) {
      throw new UnauthorizedException('Token revocado');
    }

    // Verificar que el token coincida con el hash almacenado
    const tokenMatches = await bcrypt.compare(token, storedToken.tokenHash);

    if (!tokenMatches) {
      throw new UnauthorizedException('Token inválido');
    }

    return storedToken;
  }

  /**
   * Marca un token como usado y crea uno nuevo (rotación)
   */
  async rotateRefreshToken(
    oldJti: string,
    newToken: string,
    newJti: string,
    expiresIn: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshToken> {
    const oldToken = await this.refreshTokenRepository.findOne({
      where: { jti: oldJti },
    });

    if (!oldToken) {
      throw new UnauthorizedException('Token original no encontrado');
    }

    // Marcar el token viejo como usado
    oldToken.isUsed = true;
    oldToken.lastUsedAt = new Date();
    oldToken.replacedByJti = newJti;
    await this.refreshTokenRepository.save(oldToken);

    // Crear el nuevo token con la misma familia
    return this.createRefreshToken(
      oldToken.userId,
      newToken,
      newJti,
      oldToken.tokenFamily, // Mantener la misma familia
      expiresIn,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Revoca toda una familia de tokens (usado cuando se detecta replay attack o logout)
   */
  async revokeTokenFamily(tokenFamily: string, userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      {
        tokenFamily,
        userId,
        isRevoked: false,
      },
      {
        isRevoked: true,
      },
    );
  }

  /**
   * Revoca todos los tokens de un usuario (usado en logout completo)
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      {
        userId,
        isRevoked: false,
      },
      {
        isRevoked: true,
      },
    );
  }

  /**
   * Revoca un token específico
   */
  async revokeToken(jti: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { jti },
      {
        isRevoked: true,
      },
    );
  }

  /**
   * Genera un ID único para el JWT
   */
  generateJti(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Genera un ID único para una familia de tokens
   */
  generateTokenFamily(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Limpia tokens expirados (para ejecutar periódicamente como un cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected || 0;
  }

  /**
   * Obtiene todos los tokens activos de un usuario
   */
  async getActiveTokens(userId: number): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: {
        userId,
        isRevoked: false,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Cuenta los tokens activos de un usuario
   */
  async countActiveTokens(userId: number): Promise<number> {
    return this.refreshTokenRepository.count({
      where: {
        userId,
        isRevoked: false,
        isUsed: false,
      },
    });
  }
}
