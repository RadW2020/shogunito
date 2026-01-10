import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import {
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Integration tests for RefreshTokenService
 *
 * Tests refresh token management flows with:
 * - Token creation and hashing
 * - Token validation
 * - Token rotation
 * - Replay attack detection
 * - Token revocation (single, family, all)
 * - Token cleanup
 */
describe('RefreshTokenService Integration Tests', () => {
  let module: TestingModule;
  let refreshTokenService: RefreshTokenService;
  let refreshTokenRepository: jest.Mocked<any>;

  const mockToken = 'mock-refresh-token';
  const mockJti = 'mock-jti-123';
  const mockTokenFamily = 'mock-family-123';
  const expiresIn = 3600; // 1 hour

  const mockRefreshToken: RefreshToken = {
    id: 'token-uuid-123',
    jti: mockJti,
    tokenFamily: mockTokenFamily,
    tokenHash: 'hashed-token',
    userId: 1,
    isRevoked: false,
    isUsed: false,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: new Date(),
  } as RefreshToken;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    refreshTokenService = testModule.get<RefreshTokenService>(RefreshTokenService);
    refreshTokenRepository = testModule.get(getRepositoryToken(RefreshToken));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Creation', () => {
    it('should create refresh token with hash', async () => {
      const hashedToken = await bcrypt.hash(mockToken, 10);
      const createdToken: RefreshToken = {
        ...mockRefreshToken,
        tokenHash: hashedToken,
      };

      refreshTokenRepository.create.mockReturnValue(createdToken);
      refreshTokenRepository.save.mockResolvedValue(createdToken);

      const result = await refreshTokenService.createRefreshToken(
        1,
        mockToken,
        mockJti,
        mockTokenFamily,
        expiresIn,
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveProperty('jti', mockJti);
      expect(result).toHaveProperty('tokenFamily', mockTokenFamily);
      expect(result.tokenHash).toBeDefined();
      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should create token without optional fields', async () => {
      const hashedToken = await bcrypt.hash(mockToken, 10);
      const createdToken: RefreshToken = {
        ...mockRefreshToken,
        tokenHash: hashedToken,
        ipAddress: undefined,
        userAgent: undefined,
      };

      refreshTokenRepository.create.mockReturnValue(createdToken);
      refreshTokenRepository.save.mockResolvedValue(createdToken);

      const result = await refreshTokenService.createRefreshToken(
        1,
        mockToken,
        mockJti,
        mockTokenFamily,
        expiresIn,
      );

      expect(result).toBeDefined();
    });
  });

  describe('Token Validation', () => {
    it('should validate valid token', async () => {
      const hashedToken = await bcrypt.hash(mockToken, 10);
      const validToken: RefreshToken = {
        ...mockRefreshToken,
        tokenHash: hashedToken,
        isExpired: jest.fn().mockReturnValue(false),
      };

      refreshTokenRepository.findOne.mockResolvedValue(validToken);

      const result = await refreshTokenService.validateRefreshToken(mockJti, mockToken);

      expect(result).toBeDefined();
      expect(result.jti).toBe(mockJti);
    });

    it('should throw UnauthorizedException for non-existent token', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(
        refreshTokenService.validateRefreshToken('non-existent', mockToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const expiredToken: RefreshToken = {
        ...mockRefreshToken,
        isExpired: jest.fn().mockReturnValue(true),
      };

      refreshTokenRepository.findOne.mockResolvedValue(expiredToken);

      await expect(
        refreshTokenService.validateRefreshToken(mockJti, mockToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should detect replay attack and revoke token family', async () => {
      const usedToken: RefreshToken = {
        ...mockRefreshToken,
        isUsed: true,
        isExpired: jest.fn().mockReturnValue(false),
      };

      refreshTokenRepository.findOne.mockResolvedValue(usedToken);
      refreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      await expect(
        refreshTokenService.validateRefreshToken(mockJti, mockToken),
      ).rejects.toThrow(ForbiddenException);

      expect(refreshTokenRepository.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      const revokedToken: RefreshToken = {
        ...mockRefreshToken,
        isRevoked: true,
        isExpired: jest.fn().mockReturnValue(false),
      };

      refreshTokenRepository.findOne.mockResolvedValue(revokedToken);

      await expect(
        refreshTokenService.validateRefreshToken(mockJti, mockToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token hash', async () => {
      const invalidToken: RefreshToken = {
        ...mockRefreshToken,
        tokenHash: 'wrong-hash',
        isExpired: jest.fn().mockReturnValue(false),
      };

      refreshTokenRepository.findOne.mockResolvedValue(invalidToken);

      await expect(
        refreshTokenService.validateRefreshToken(mockJti, 'wrong-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Token Rotation', () => {
    it('should rotate token and mark old as used', async () => {
      const newJti = 'new-jti-456';
      const newToken = 'new-refresh-token';
      const hashedOldToken = await bcrypt.hash(mockToken, 10);
      const hashedNewToken = await bcrypt.hash(newToken, 10);

      const oldToken: RefreshToken = {
        ...mockRefreshToken,
        tokenHash: hashedOldToken,
      };

      const newRefreshToken: RefreshToken = {
        ...mockRefreshToken,
        jti: newJti,
        tokenHash: hashedNewToken,
      };

      refreshTokenRepository.findOne.mockResolvedValue(oldToken);
      refreshTokenRepository.save
        .mockResolvedValueOnce({ ...oldToken, isUsed: true })
        .mockResolvedValueOnce(newRefreshToken);
      refreshTokenRepository.create.mockReturnValue(newRefreshToken);

      const result = await refreshTokenService.rotateRefreshToken(
        mockJti,
        newToken,
        newJti,
        expiresIn,
      );

      expect(result.jti).toBe(newJti);
      expect(result.tokenFamily).toBe(mockTokenFamily);
      expect(refreshTokenRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException for non-existent old token', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(
        refreshTokenService.rotateRefreshToken(
          'non-existent',
          'new-token',
          'new-jti',
          expiresIn,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Token Revocation', () => {
    it('should revoke single token', async () => {
      refreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      await refreshTokenService.revokeToken(mockJti);

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { jti: mockJti },
        { isRevoked: true },
      );
    });

    it('should revoke token family', async () => {
      refreshTokenRepository.update.mockResolvedValue({ affected: 2 });

      await refreshTokenService.revokeTokenFamily(mockTokenFamily, 1);

      expect(refreshTokenRepository.update).toHaveBeenCalled();
    });

    it('should revoke all user tokens', async () => {
      refreshTokenRepository.update.mockResolvedValue({ affected: 5 });

      await refreshTokenService.revokeAllUserTokens(1);

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 1, isRevoked: false },
        { isRevoked: true },
      );
    });
  });

  describe('Token Utilities', () => {
    it('should generate unique JTI', () => {
      const jti1 = refreshTokenService.generateJti();
      const jti2 = refreshTokenService.generateJti();

      expect(jti1).toBeDefined();
      expect(jti2).toBeDefined();
      expect(jti1).not.toBe(jti2);
      expect(jti1.length).toBeGreaterThan(0);
    });

    it('should generate unique token family', () => {
      const family1 = refreshTokenService.generateTokenFamily();
      const family2 = refreshTokenService.generateTokenFamily();

      expect(family1).toBeDefined();
      expect(family2).toBeDefined();
      expect(family1).not.toBe(family2);
      expect(family1.length).toBeGreaterThan(0);
    });
  });

  describe('Token Cleanup', () => {
    it('should cleanup expired tokens', async () => {
      refreshTokenRepository.delete.mockResolvedValue({ affected: 10 });

      const result = await refreshTokenService.cleanupExpiredTokens();

      expect(result).toBe(10);
      expect(refreshTokenRepository.delete).toHaveBeenCalled();
    });

    it('should return 0 when no expired tokens', async () => {
      refreshTokenRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await refreshTokenService.cleanupExpiredTokens();

      expect(result).toBe(0);
    });
  });

  describe('Active Tokens', () => {
    it('should get active tokens for user', async () => {
      const activeTokens = [mockRefreshToken];
      refreshTokenRepository.find.mockResolvedValue(activeTokens);

      const result = await refreshTokenService.getActiveTokens(1);

      expect(result).toHaveLength(1);
      expect(refreshTokenRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 1,
          isRevoked: false,
          isUsed: false,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    });

    it('should count active tokens for user', async () => {
      refreshTokenRepository.count.mockResolvedValue(3);

      const result = await refreshTokenService.countActiveTokens(1);

      expect(result).toBe(3);
      expect(refreshTokenRepository.count).toHaveBeenCalledWith({
        where: {
          userId: 1,
          isRevoked: false,
          isUsed: false,
        },
      });
    });
  });
});




