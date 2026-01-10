import { Test, TestingModule } from '@nestjs/testing';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { Request, Response } from 'express';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      method: 'POST',
      url: '/test',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should handle HttpException with string response', () => {
      const exception = new BadRequestException('Bad request message');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(callArgs.message).toBe('Bad request message');
      expect(callArgs.error).toBeDefined();
    });

    it('should handle HttpException with object response', () => {
      const exception = new BadRequestException({
        message: 'Validation failed',
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toBe('Validation failed');
      expect(callArgs.error).toBe('Bad Request');
    });

    it('should handle HttpException with object response without message', () => {
      const exception = new BadRequestException({
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toBe('Bad Request');
      expect(callArgs.error).toBe('Bad Request');
    });

    it('should handle HttpException with object response using error field', () => {
      const exception = new BadRequestException({
        error: 'Custom Error',
      });

      filter.catch(exception, mockArgumentsHost);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error).toBe('Custom Error');
    });

    it('should handle NotFoundException', () => {
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toBe('Resource not found');
    });

    it('should handle ForbiddenException', () => {
      const exception = new ForbiddenException('Access denied');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toBe('Access denied');
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error message');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toBe('Generic error message');
      expect(callArgs.error).toBe('Error');
    });

    it('should handle unknown error types', () => {
      const error = { someProperty: 'unknown error' };

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.message).toBe('Internal server error');
      expect(callArgs.error).toBe('InternalServerError');
    });

    it('should include timestamp in response', () => {
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.timestamp).toBeDefined();
      expect(new Date(callArgs.timestamp).toISOString()).toBe(callArgs.timestamp);
    });

    it('should include request path and method in response', () => {
      mockRequest.url = '/api/users/123';
      mockRequest.method = 'GET';

      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.path).toBe('/api/users/123');
      expect(callArgs.method).toBe('GET');
    });

    it('should log error with stack trace for Error instances', () => {
      const loggerSpy = jest.spyOn(filter['logger'], 'error');
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      filter.catch(error, mockArgumentsHost);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('POST /test'),
        'Error stack trace',
      );
    });

    it('should log error without stack trace for non-Error instances', () => {
      const loggerSpy = jest.spyOn(filter['logger'], 'error');
      const error = { someProperty: 'unknown error' };

      filter.catch(error, mockArgumentsHost);

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('POST /test'), undefined);
    });
  });
});
