import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';
import { LessThan } from 'typeorm';

jest.mock('bcrypt');

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let refreshTokenRepository: any;

  const mockRefreshToken: RefreshToken = {
    id: 'token-123',
    userId: 'user-123',
    jti: 'jti-123',
    tokenFamily: 'family-123',
    tokenHash: '$2b$10$hashedtoken',
    expiresAt: new Date(Date.now() + 604800000), // 7 days from now
    isUsed: false,
    isRevoked: false,
    isExpired: jest.fn().mockReturnValue(false),
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRefreshToken', () => {
    it('should create a new refresh token', async () => {
      const expiresIn = 604800; // 7 days
      const token = 'refresh-token-123';
      const jti = 'jti-123';
      const tokenFamily = 'family-123';

      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedtoken');
      refreshTokenRepository.create.mockReturnValue(mockRefreshToken);
      refreshTokenRepository.save.mockResolvedValue(mockRefreshToken);

      const result = await service.createRefreshToken(
        'user-123',
        token,
        jti,
        tokenFamily,
        expiresIn,
        '127.0.0.1',
        'test-agent',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(token, 10);
      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockRefreshToken);
    });

    it('should create token without ipAddress and userAgent', async () => {
      const expiresIn = 604800;
      const token = 'refresh-token-123';
      const jti = 'jti-123';
      const tokenFamily = 'family-123';

      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedtoken');
      refreshTokenRepository.create.mockReturnValue(mockRefreshToken);
      refreshTokenRepository.save.mockResolvedValue(mockRefreshToken);

      await service.createRefreshToken('user-123', token, jti, tokenFamily, expiresIn);

      expect(refreshTokenRepository.create).toHaveBeenCalled();
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate a valid refresh token', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateRefreshToken('jti-123', 'token-123');

      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { jti: 'jti-123' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('token-123', mockRefreshToken.tokenHash);
      expect(result).toEqual(mockRefreshToken);
    });

    it('should throw UnauthorizedException when token not found', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.validateRefreshToken('jti-999', 'token-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      const expiredToken = {
        ...mockRefreshToken,
        isExpired: jest.fn().mockReturnValue(true),
      };
      refreshTokenRepository.findOne.mockResolvedValue(expiredToken);

      await expect(service.validateRefreshToken('jti-123', 'token-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when token is already used (replay attack)', async () => {
      const usedToken = {
        ...mockRefreshToken,
        isUsed: true,
        isExpired: jest.fn().mockReturnValue(false),
      };
      refreshTokenRepository.findOne.mockResolvedValue(usedToken);
      refreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.validateRefreshToken('jti-123', 'token-123')).rejects.toThrow(
        ForbiddenException,
      );

      expect(refreshTokenRepository.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is revoked', async () => {
      const revokedToken = {
        ...mockRefreshToken,
        isRevoked: true,
        isExpired: jest.fn().mockReturnValue(false),
      };
      refreshTokenRepository.findOne.mockResolvedValue(revokedToken);

      await expect(service.validateRefreshToken('jti-123', 'token-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token hash does not match', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateRefreshToken('jti-123', 'wrong-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('rotateRefreshToken', () => {
    it('should rotate refresh token successfully', async () => {
      const oldToken = { ...mockRefreshToken };
      refreshTokenRepository.findOne.mockResolvedValue(oldToken);
      refreshTokenRepository.save.mockResolvedValue(oldToken);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$newhashedtoken');
      refreshTokenRepository.create.mockReturnValue({
        ...mockRefreshToken,
        jti: 'new-jti-123',
      });
      refreshTokenRepository.save
        .mockResolvedValueOnce(oldToken) // Save old token
        .mockResolvedValueOnce({ ...mockRefreshToken, jti: 'new-jti-123' }); // Save new token

      const result = await service.rotateRefreshToken(
        'jti-123',
        'new-token',
        'new-jti-123',
        604800,
        '127.0.0.1',
        'test-agent',
      );

      expect(oldToken.isUsed).toBe(true);
      expect(oldToken.replacedByJti).toBe('new-jti-123');
      expect(refreshTokenRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedException when old token not found', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.rotateRefreshToken('jti-999', 'new-token', 'new-jti-123', 604800),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revokeTokenFamily', () => {
    it('should revoke all tokens in a family', async () => {
      refreshTokenRepository.update.mockResolvedValue({ affected: 3 });

      await service.revokeTokenFamily('family-123', 'user-123');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        {
          tokenFamily: 'family-123',
          userId: 'user-123',
          isRevoked: false,
        },
        {
          isRevoked: true,
        },
      );
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      refreshTokenRepository.update.mockResolvedValue({ affected: 5 });

      await service.revokeAllUserTokens('user-123');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        {
          userId: 'user-123',
          isRevoked: false,
        },
        {
          isRevoked: true,
        },
      );
    });
  });

  describe('revokeToken', () => {
    it('should revoke a specific token', async () => {
      refreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      await service.revokeToken('jti-123');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { jti: 'jti-123' },
        { isRevoked: true },
      );
    });
  });

  describe('generateJti', () => {
    it('should generate a unique JTI', () => {
      const jti1 = service.generateJti();
      const jti2 = service.generateJti();

      expect(jti1).toBeDefined();
      expect(jti2).toBeDefined();
      expect(jti1).not.toBe(jti2);
      expect(jti1.length).toBe(64); // 32 bytes = 64 hex characters
    });
  });

  describe('generateTokenFamily', () => {
    it('should generate a unique token family', () => {
      const family1 = service.generateTokenFamily();
      const family2 = service.generateTokenFamily();

      expect(family1).toBeDefined();
      expect(family2).toBeDefined();
      expect(family1).not.toBe(family2);
      expect(family1.length).toBe(32); // 16 bytes = 32 hex characters
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      refreshTokenRepository.delete.mockResolvedValue({ affected: 5 });

      const result = await service.cleanupExpiredTokens();

      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
        expiresAt: LessThan(expect.any(Date)),
      });
      expect(result).toBe(5);
    });

    it('should return 0 when no tokens are deleted', async () => {
      refreshTokenRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      refreshTokenRepository.delete.mockResolvedValue({});

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(0);
    });
  });

  describe('getActiveTokens', () => {
    it('should return active tokens for a user', async () => {
      const activeTokens = [mockRefreshToken];
      refreshTokenRepository.find.mockResolvedValue(activeTokens);

      const result = await service.getActiveTokens('user-123');

      expect(refreshTokenRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isRevoked: false,
          isUsed: false,
        },
        order: {
          createdAt: 'DESC',
        },
      });
      expect(result).toEqual(activeTokens);
    });
  });

  describe('countActiveTokens', () => {
    it('should count active tokens for a user', async () => {
      refreshTokenRepository.count.mockResolvedValue(3);

      const result = await service.countActiveTokens('user-123');

      expect(refreshTokenRepository.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isRevoked: false,
          isUsed: false,
        },
      });
      expect(result).toBe(3);
    });
  });
});
