import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditLoggerInterceptor } from './audit-logger.interceptor';
import { AuditLog } from '../../entities/audit-log.entity';
import { User } from '../../entities/user.entity';

describe('AuditLoggerInterceptor', () => {
  let interceptor: AuditLoggerInterceptor;
  let auditLogRepository: any;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'producer',
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLoggerInterceptor,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<AuditLoggerInterceptor>(AuditLoggerInterceptor);
    auditLogRepository = module.get(getRepositoryToken(AuditLog));

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'POST',
          url: '/projects',
          body: { name: 'Test Project' },
          user: mockUser,
          headers: { 'user-agent': 'test-agent' },
          ip: '127.0.0.1',
        }),
        getResponse: jest.fn().mockReturnValue({
          statusCode: 201,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn(),
    } as unknown as CallHandler;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should skip logging for GET requests', (done) => {
      const getContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'GET',
            url: '/projects',
            user: mockUser,
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
      } as unknown as ExecutionContext;

      mockCallHandler.handle = jest.fn().mockReturnValue(of({ data: 'test' }));

      interceptor.intercept(getContext, mockCallHandler).subscribe(() => {
        expect(auditLogRepository.save).not.toHaveBeenCalled();
        done();
      });
    });

    it('should skip logging when user is not authenticated', (done) => {
      const noUserContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'POST',
            url: '/projects',
            body: { name: 'Test Project' },
            user: undefined,
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 201,
          }),
        }),
      } as unknown as ExecutionContext;

      mockCallHandler.handle = jest.fn().mockReturnValue(of({ data: 'test' }));

      interceptor.intercept(noUserContext, mockCallHandler).subscribe(() => {
        expect(auditLogRepository.save).not.toHaveBeenCalled();
        done();
      });
    });

    it('should log POST requests successfully', (done) => {
      const responseData = { id: 'project-123', name: 'Test Project' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));
      auditLogRepository.create = jest.fn().mockReturnValue({});
      auditLogRepository.save = jest.fn().mockResolvedValue({});

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(auditLogRepository.create).toHaveBeenCalled();
        expect(auditLogRepository.save).toHaveBeenCalled();
        done();
      });
    });

    it('should log PATCH requests successfully', (done) => {
      const patchContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'PATCH',
            url: '/projects/project-123',
            body: { name: 'Updated Project' },
            user: mockUser,
            headers: { 'user-agent': 'test-agent' },
            ip: '127.0.0.1',
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
      } as unknown as ExecutionContext;

      const responseData = { id: 'project-123', name: 'Updated Project' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));
      auditLogRepository.create = jest.fn().mockReturnValue({});
      auditLogRepository.save = jest.fn().mockResolvedValue({});

      interceptor.intercept(patchContext, mockCallHandler).subscribe(() => {
        expect(auditLogRepository.save).toHaveBeenCalled();
        done();
      });
    });

    it('should log DELETE requests successfully', (done) => {
      const deleteContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'DELETE',
            url: '/projects/project-123',
            body: {},
            user: mockUser,
            headers: { 'user-agent': 'test-agent' },
            ip: '127.0.0.1',
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
      } as unknown as ExecutionContext;

      mockCallHandler.handle = jest.fn().mockReturnValue(of({}));
      auditLogRepository.create = jest.fn().mockReturnValue({});
      auditLogRepository.save = jest.fn().mockResolvedValue({});

      interceptor.intercept(deleteContext, mockCallHandler).subscribe(() => {
        expect(auditLogRepository.save).toHaveBeenCalled();
        done();
      });
    });

    it('should handle errors gracefully without failing the request', (done) => {
      const error = new Error('Database error');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));
      auditLogRepository.save = jest.fn().mockRejectedValue(error);

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          expect(auditLogRepository.save).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should extract entity type from URL', (done) => {
      const projectsContext = {
        ...mockExecutionContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'POST',
            url: '/projects',
            body: { name: 'Test Project' },
            user: mockUser,
            headers: { 'user-agent': 'test-agent' },
            ip: '127.0.0.1',
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 201,
          }),
        }),
      } as unknown as ExecutionContext;

      const responseData = { id: 'project-123' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));
      auditLogRepository.create = jest.fn().mockImplementation((log) => {
        expect(log.entityType).toBe('Project');
        return log;
      });
      auditLogRepository.save = jest.fn().mockResolvedValue({});

      interceptor.intercept(projectsContext, mockCallHandler).subscribe(() => {
        done();
      });
    });
  });
});
