import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'producer',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserRateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [mockUser];
      mockUsersService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe('getMyProfile', () => {
    it('should return current user profile', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.getMyProfile(mockUser);

      expect(service.findOne).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-123');

      expect(service.findOne).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('Usuario con ID user-999 no encontrado'),
      );

      await expect(controller.findOne('user-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user successfully when user is admin', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const } as User;
      const updateData = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updateData };

      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update('user-123', updateData, adminUser);

      expect(service.update).toHaveBeenCalledWith('user-123', updateData, expect.any(String));
      expect(result).toEqual(updatedUser);
    });

    it('should update own profile successfully', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updateData };

      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser.id, updateData, mockUser);

      expect(service.update).toHaveBeenCalledWith(mockUser.id, updateData, expect.any(String));
      expect(result).toEqual(updatedUser);
    });

    it('should remove role from updateData when user is not admin', async () => {
      const updateData = { name: 'Updated Name', role: 'admin' as const };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser.id, updateData, mockUser);

      expect(service.update).toHaveBeenCalledWith(
        mockUser.id,
        { name: 'Updated Name' },
        expect.any(String),
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw error when non-admin tries to update another user', async () => {
      const updateData = { name: 'Updated Name' };
      const otherUser = { ...mockUser, id: 'user-999' };

      await expect(controller.update('user-999', updateData, mockUser)).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should delete a user successfully', async () => {
      const removeResult = { message: 'Usuario eliminado exitosamente' };
      mockUsersService.remove.mockResolvedValue(removeResult);

      const result = await controller.remove('user-123');

      expect(service.remove).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(removeResult);
    });
  });
});
