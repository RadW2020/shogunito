import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Repository } from 'typeorm';
import { User } from '../../src/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailService } from '../../src/email/email.service';
import { setupTestApp } from '../helpers/test-utils';
import * as bcrypt from 'bcrypt';

// Mock EmailService to avoid sending real emails during tests
const mockEmailService = {
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue(true),
};

describe('Auth Password Recovery (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let testUser: User;
  let resetToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    setupTestApp(app);
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Reset mock calls before each test
    jest.clearAllMocks();

    // Limpiar base de datos antes de cada test
    await userRepository.createQueryBuilder().delete().where('1=1').execute();

    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash('Password123', 10);
    const user = userRepository.create({
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: hashedPassword,
      role: 'member',
      isActive: true,
    });
    testUser = await userRepository.save(user);
  });

  describe('/auth/forgot-password (POST)', () => {
    it('should send password reset email for valid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toContain('Si el correo existe en nuestro sistema');

      // Verify that email service was called (mocked, so no real email sent)
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return same message for non-existent email (security)', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('message');
          expect(res.body.data.message).toContain('Si el correo existe en nuestro sistema');
        });
    });

    it('should return same message for inactive user (security)', async () => {
      // Desactivar usuario
      await userRepository.update(testUser.id, { isActive: false });

      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('message');
          expect(res.body.data.message).toContain('Si el correo existe en nuestro sistema');
        });
    });

    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should reject missing email', () => {
      return request(app.getHttpServer()).post('/auth/forgot-password').send({}).expect(400);
    });

    it('should create reset token in database', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      const updatedUser = await userRepository.findOne({
        where: { id: testUser.id },
      });

      expect(updatedUser).toBeDefined();
      if (!updatedUser) {
        throw new Error('User not found');
      }
      expect(updatedUser.passwordResetToken).toBeDefined();
      expect(updatedUser.passwordResetToken).not.toBeNull();
      expect(updatedUser.passwordResetExpiresAt).toBeDefined();
      expect(updatedUser.passwordResetExpiresAt).not.toBeNull();
      if (!updatedUser.passwordResetExpiresAt) {
        throw new Error('passwordResetExpiresAt is null');
      }
      expect(updatedUser.passwordResetExpiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('/auth/validate-reset-token (POST)', () => {
    beforeEach(async () => {
      // Generar token válido
      const token = 'valid-test-token-12345';
      const expiresAt = new Date(Date.now() + 3600000); // 1 hora

      await userRepository.update(testUser.id, {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
      });

      resetToken = token;
    });

    it('should validate valid token', () => {
      return request(app.getHttpServer())
        .post('/auth/validate-reset-token')
        .send({ token: resetToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('valid', true);
        });
    });

    it('should reject invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/validate-reset-token')
        .send({ token: 'invalid-token' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('valid', false);
          expect(res.body.data).toHaveProperty('message');
        });
    });

    it('should reject expired token', async () => {
      // Crear token expirado
      const expiredToken = 'expired-test-token';
      const expiredDate = new Date(Date.now() - 3600000); // Hace 1 hora

      await userRepository.update(testUser.id, {
        passwordResetToken: expiredToken,
        passwordResetExpiresAt: expiredDate,
      });

      return request(app.getHttpServer())
        .post('/auth/validate-reset-token')
        .send({ token: expiredToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('valid', false);
        });
    });

    it('should reject missing token', () => {
      return request(app.getHttpServer()).post('/auth/validate-reset-token').send({}).expect(400);
    });
  });

  describe('/auth/reset-password (POST)', () => {
    beforeEach(async () => {
      // Generar token válido
      const token = 'valid-reset-token-12345';
      const expiresAt = new Date(Date.now() + 3600000);

      await userRepository.update(testUser.id, {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
      });

      resetToken = token;
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123';

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: newPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('message');
          expect(res.body.data.message).toContain('actualizada exitosamente');
        });

      // Verificar que la contraseña cambió
      const updatedUser = await userRepository.findOne({
        where: { id: testUser.id },
        select: ['id', 'email', 'passwordHash', 'passwordResetToken', 'passwordResetExpiresAt'],
      });

      expect(updatedUser).toBeDefined();
      if (!updatedUser) {
        throw new Error('User not found');
      }
      const passwordMatches = await bcrypt.compare(newPassword, updatedUser.passwordHash);
      expect(passwordMatches).toBe(true);

      // Verificar que el token se limpió (puede ser null o undefined)
      expect(updatedUser.passwordResetToken).toBeFalsy();
      expect(updatedUser.passwordResetExpiresAt).toBeFalsy();
    });

    it('should reject weak password (less than 8 characters)', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'Pass1',
        })
        .expect(400);
    });

    it('should reject password without uppercase', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'password123',
        })
        .expect(400);
    });

    it('should reject password without lowercase', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'PASSWORD123',
        })
        .expect(400);
    });

    it('should reject password without number', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'PasswordABC',
        })
        .expect(400);
    });

    it('should reject invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          if (res.body.error?.message) {
            expect(res.body.error.message).toContain('inválido o ha expirado');
          } else if (res.body.message) {
            expect(res.body.message).toContain('inválido o ha expirado');
          }
        });
    });

    it('should reject expired token', async () => {
      // Crear token expirado
      const expiredToken = 'expired-token-12345';
      const expiredDate = new Date(Date.now() - 3600000);

      await userRepository.update(testUser.id, {
        passwordResetToken: expiredToken,
        passwordResetExpiresAt: expiredDate,
      });

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: expiredToken,
          newPassword: 'NewPassword123',
        })
        .expect(400);
    });

    it('should reject reset for inactive user', async () => {
      // Desactivar usuario
      await userRepository.update(testUser.id, { isActive: false });

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123',
        })
        .expect(403)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          if (res.body.error?.message) {
            expect(res.body.error.message).toContain('desactivada');
          } else if (res.body.message) {
            expect(res.body.message).toContain('desactivada');
          }
        });
    });

    it('should invalidate refresh tokens on password reset', async () => {
      // Simular refresh token existente
      const refreshToken = await bcrypt.hash('some-refresh-token', 10);
      await userRepository.update(testUser.id, { refreshToken });

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123',
        })
        .expect(200);

      // Verificar que el refresh token se eliminó
      const updatedUser = await userRepository.findOne({
        where: { id: testUser.id },
      });
      expect(updatedUser).toBeDefined();
      if (!updatedUser) {
        throw new Error('User not found');
      }
      expect(updatedUser.refreshToken).toBeNull();
    });

    it('should allow login with new password after reset', async () => {
      const newPassword = 'NewPassword123';

      // Resetear contraseña
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: newPassword,
        })
        .expect(200);

      // Intentar login con nueva contraseña
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: newPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('tokens');
          expect(res.body.data.tokens).toHaveProperty('accessToken');
        });
    });

    it('should not allow login with old password after reset', async () => {
      const oldPassword = 'Password123';
      const newPassword = 'NewPassword123';

      // Resetear contraseña
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: newPassword,
        })
        .expect(200);

      // Intentar login con contraseña antigua (debe fallar)
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: oldPassword,
        })
        .expect(401);
    });

    it('should reject missing token', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          newPassword: 'NewPassword123',
        })
        .expect(400);
    });

    it('should reject missing password', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
        })
        .expect(400);
    });
  });

  describe('Password Recovery Flow (Integration)', () => {
    it('should complete full password recovery flow', async () => {
      // 1. Solicitar recuperación de contraseña
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      // 2. Obtener token de la base de datos (en producción vendría del email)
      const userWithToken = await userRepository.findOne({
        where: { id: testUser.id },
      });
      expect(userWithToken).toBeDefined();
      if (!userWithToken) {
        throw new Error('User not found');
      }
      const token = userWithToken.passwordResetToken;

      // 3. Validar token
      await request(app.getHttpServer())
        .post('/auth/validate-reset-token')
        .send({ token })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.valid).toBe(true);
        });

      // 4. Resetear contraseña
      const newPassword = 'BrandNewPassword123';
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword })
        .expect(200);

      // 5. Verificar que puede hacer login con nueva contraseña
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: newPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data).toHaveProperty('tokens');
        });

      // 6. Verificar que el token ya no es válido
      await request(app.getHttpServer())
        .post('/auth/validate-reset-token')
        .send({ token })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.valid).toBe(false);
        });
    });

    it('should not allow token reuse after successful reset', async () => {
      // 1. Solicitar recuperación
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      // 2. Obtener token
      const userWithToken = await userRepository.findOne({
        where: { id: testUser.id },
      });
      expect(userWithToken).toBeDefined();
      if (!userWithToken) {
        throw new Error('User not found');
      }
      const token = userWithToken.passwordResetToken;

      // 3. Resetear contraseña (primera vez)
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'NewPassword123' })
        .expect(200);

      // 4. Intentar usar el mismo token de nuevo (debe fallar)
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'AnotherPassword123' })
        .expect(400);
    });

    it('should generate new token if user requests reset again', async () => {
      // 1. Primera solicitud de recuperación
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      const firstUser = await userRepository.findOne({
        where: { id: testUser.id },
      });
      expect(firstUser).toBeDefined();
      if (!firstUser) {
        throw new Error('User not found');
      }
      const firstToken = firstUser.passwordResetToken;

      // 2. Segunda solicitud de recuperación
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      const secondUser = await userRepository.findOne({
        where: { id: testUser.id },
      });
      expect(secondUser).toBeDefined();
      if (!secondUser) {
        throw new Error('User not found');
      }
      const secondToken = secondUser.passwordResetToken;

      // 3. Verificar que los tokens son diferentes
      expect(firstToken).not.toBe(secondToken);

      // 4. El primer token ya no debería ser válido
      await request(app.getHttpServer())
        .post('/auth/validate-reset-token')
        .send({ token: firstToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.valid).toBe(false);
        });

      // 5. El segundo token debería ser válido
      await request(app.getHttpServer())
        .post('/auth/validate-reset-token')
        .send({ token: secondToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.valid).toBe(true);
        });
    });
  });
});
