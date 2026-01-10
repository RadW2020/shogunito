import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SlackService } from '../notifications/slack/slack.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';

/**
 * Integration tests for UsersService
 *
 * Tests user management flows with:
 * - User creation with password hashing
 * - Email uniqueness validation
 * - User updates and email changes
 * - Admin user creation notifications
 * - User deactivation
 */
describe('UsersService Integration Tests', () => {
  let module: TestingModule;
  let usersService: UsersService;
  let userRepository: jest.Mocked<any>;
  let slackService: jest.Mocked<SlackService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'member',
    isActive: true,
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockAdminUser: User = {
    id: 2,
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    isActive: true,
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getOne: jest.fn(),
            })),
          },
        },
        {
          provide: SlackService,
          useValue: {
            notifyAdminCreated: jest.fn(),
            notifyPermissionsChanged: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {},
        },
      ],
    }).compile();

    usersService = testModule.get<UsersService>(UsersService);
    userRepository = testModule.get(getRepositoryToken(User));
    slackService = testModule.get<SlackService>(SlackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Creation', () => {
    it('should create user with hashed password', async () => {
      const createDto = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
        role: 'member',
      };

      userRepository.findOne.mockResolvedValue(null); // No existing user
      userRepository.create.mockReturnValue({
        ...createDto,
        id: 3,
        passwordHash: '$2b$10$hashed',
      });
      userRepository.save.mockResolvedValue({
        id: 3,
        email: createDto.email,
        name: createDto.name,
        role: createDto.role,
        passwordHash: '$2b$10$hashed',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await usersService.create(createDto);

      expect(result).toHaveProperty('email', createDto.email);
      expect(result).toHaveProperty('name', createDto.name);
      expect(userRepository.save).toHaveBeenCalled();
      expect(result.passwordHash).toBeDefined();
    });

    it('should prevent duplicate email addresses', async () => {
      const createDto = {
        email: 'existing@example.com',
        name: 'New User',
        password: 'password123',
        role: 'member',
      };

      userRepository.findOne.mockResolvedValue(mockUser); // Existing user

      await expect(usersService.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should require password for new users', async () => {
      const createDto = {
        email: 'newuser@example.com',
        name: 'New User',
        role: 'member',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(usersService.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should send notification when admin user is created', async () => {
      const createDto = {
        email: 'newadmin@example.com',
        name: 'New Admin',
        password: 'password123',
        role: 'admin',
      };

      const createdAdmin = {
        id: 4,
        email: createDto.email,
        name: createDto.name,
        role: 'admin',
        passwordHash: '$2b$10$hashed',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(createdAdmin);
      userRepository.save.mockResolvedValue(createdAdmin);

      await usersService.create(createDto, 1);

      expect(slackService.notifyAdminCreated).toHaveBeenCalledWith(
        createdAdmin.name,
        createdAdmin.email,
        '1',
      );
    });
  });

  describe('User Updates', () => {
    it('should update user information', async () => {
      const updateDto = {
        name: 'Updated Name',
        role: 'producer',
      };

      const updatedUser = {
        ...mockUser,
        ...updateDto,
      };

      userRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call in update
        .mockResolvedValueOnce(updatedUser); // Second call in findOne (return)
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await usersService.update(1, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.role).toBe(updateDto.role);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should prevent duplicate email on update', async () => {
      const updateDto = {
        email: 'existing@example.com',
      };

      userRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call to get user
        .mockResolvedValueOnce(mockAdminUser); // Second call to check email

      await expect(usersService.update(1, updateDto)).rejects.toThrow(ConflictException);
    });

    it('should allow email update if not in use', async () => {
      const updateDto = {
        email: 'newemail@example.com',
      };

      const updatedUser = {
        ...mockUser,
        ...updateDto,
      };

      userRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call to get user
        .mockResolvedValueOnce(null) // Second call to check email (not in use)
        .mockResolvedValueOnce(updatedUser); // Third call in findOne (return)
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await usersService.update(1, updateDto);

      expect(result.email).toBe(updateDto.email);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(usersService.update(999, { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('User Retrieval', () => {
    it('should find user by ID', async () => {
      // findOne uses select to exclude passwordHash
      const userWithoutPassword = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        isActive: mockUser.isActive,
        lastLoginAt: null,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };
      userRepository.findOne.mockResolvedValue(userWithoutPassword);

      const result = await usersService.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('email', mockUser.email);
      expect(result.passwordHash).toBeUndefined(); // Should not return password
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(usersService.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should find user by email', async () => {
      const userForEmail = { ...mockUser, email: 'test@example.com' };
      userRepository.findOne.mockResolvedValue(userForEmail);

      const result = await usersService.findByEmail('test@example.com');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should find user by email with password', async () => {
      const userForEmail = { ...mockUser, email: 'test@example.com' };
      userRepository.findOne.mockResolvedValue(userForEmail);

      const result = await usersService.findByEmailWithPassword('test@example.com');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('passwordHash');
    });

    it('should return all users', async () => {
      // findAll uses select to exclude passwordHash
      const usersWithoutPassword = [
        {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          isActive: mockUser.isActive,
          lastLoginAt: null,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
        {
          id: mockAdminUser.id,
          email: mockAdminUser.email,
          name: mockAdminUser.name,
          role: mockAdminUser.role,
          isActive: mockAdminUser.isActive,
          lastLoginAt: null,
          createdAt: mockAdminUser.createdAt,
          updatedAt: mockAdminUser.updatedAt,
        },
      ];
      userRepository.find.mockResolvedValue(usersWithoutPassword);

      const result = await usersService.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('User Deactivation', () => {
    it('should deactivate user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await usersService.update(1, { isActive: false });

      expect(result.isActive).toBe(false);
    });

    it('should reactivate user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userRepository.findOne.mockResolvedValue(inactiveUser);
      userRepository.save.mockResolvedValue({
        ...inactiveUser,
        isActive: true,
      });

      const result = await usersService.update(1, { isActive: true });

      expect(result.isActive).toBe(true);
    });
  });
});

