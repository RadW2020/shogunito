import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SlackService } from '../notifications/slack/slack.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: any;
  let slackService: SlackService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'producer',
    isActive: true,
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
            remove: jest.fn(),
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
          },
        },
        {
          provide: NotificationsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    slackService = module.get<SlackService>(SlackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [mockUser];
      userRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      const expectedSelect = [
        'id',
        'email',
        'name',
        'role',
        'isActive',
        'lastLoginAt',
        'createdAt',
        'updatedAt',
      ];
      expect(userRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        select: expectedSelect,
      });
      // Verify sensitive fields are excluded
      expect(userRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.arrayContaining(expectedSelect),
        }),
      );
      expect(userRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.arrayContaining(['passwordHash', 'refreshToken']),
        }),
      );
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('user-123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: expect.any(Array),
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-999')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('user-999')).rejects.toThrow(
        'Usuario con ID user-999 no encontrado',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByEmailWithPassword', () => {
    it('should return a user with password hash', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmailWithPassword('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.arrayContaining(['passwordHash']),
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
        role: 'producer' as const,
      };

      const newUser = { ...mockUser, ...userData };
      userRepository.findOne.mockResolvedValue(null); // No existing user
      userRepository.create.mockReturnValue(newUser);
      userRepository.save.mockResolvedValue(newUser);

      const result = await service.create(userData);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual(newUser);
    });

    it('should throw ConflictException when email already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'New User',
        password: 'password123',
      };

      userRepository.findOne.mockResolvedValue(mockUser); // Existing user

      await expect(service.create(userData)).rejects.toThrow(ConflictException);
      await expect(service.create(userData)).rejects.toThrow('El email ya está registrado');
    });

    it('should throw ConflictException when password is not provided', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.create(userData)).rejects.toThrow(ConflictException);
      await expect(service.create(userData)).rejects.toThrow('Password is required');
    });

    it('should send notification when admin user is created', async () => {
      const userData = {
        email: 'admin@example.com',
        name: 'Admin User',
        password: 'password123',
        role: 'admin' as const,
      };

      const adminUser = { ...mockUser, ...userData, role: 'admin' };
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(adminUser);
      userRepository.save.mockResolvedValue(adminUser);
      jest.spyOn(slackService, 'notifyAdminCreated').mockResolvedValue(undefined);

      await service.create(userData, 'creator@example.com');

      expect(slackService.notifyAdminCreated).toHaveBeenCalledWith(
        adminUser.name,
        adminUser.email,
        'creator@example.com',
      );
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updateData };

      // First findOne: get user for update (with passwordHash)
      // Second findOne: return updated user (without passwordHash, via findOne method)
      userRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call - get user for update
        .mockResolvedValueOnce(updatedUser); // Second call - return updated user (via findOne at end)
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', updateData, 'updater@example.com');

      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const updateData = { name: 'Updated Name' };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.update('user-999', updateData)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a user successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.remove.mockResolvedValue(mockUser);

      const result = await service.remove('user-123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: expect.any(Array),
      });
      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ message: 'Usuario eliminado exitosamente' });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('user-999')).rejects.toThrow(NotFoundException);
    });
  });
});
