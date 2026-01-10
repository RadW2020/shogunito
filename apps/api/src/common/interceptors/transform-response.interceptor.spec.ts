import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformResponseInterceptor } from './transform-response.interceptor';
import { ApiResponse } from '../interfaces/api-response.interface';

describe('TransformResponseInterceptor', () => {
  let interceptor: TransformResponseInterceptor<any>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformResponseInterceptor],
    }).compile();

    interceptor = module.get<TransformResponseInterceptor<any>>(TransformResponseInterceptor);

    mockExecutionContext = {
      switchToHttp: jest.fn(),
      getRequest: jest.fn(),
      getResponse: jest.fn(),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn(),
    } as unknown as CallHandler;
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should wrap plain data in ApiResponse format', (done) => {
      const plainData = { id: 1, name: 'Test' };
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(plainData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: plainData,
            metadata: {
              timestamp: expect.any(String),
            },
          });
          expect(result.success).toBe(true);
          expect(result.data).toEqual(plainData);
          expect(result.metadata.timestamp).toBeDefined();
          done();
        },
      });
    });

    it('should wrap array data in ApiResponse format with total', (done) => {
      const arrayData = [{ id: 1 }, { id: 2 }, { id: 3 }];
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(arrayData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: arrayData,
            metadata: {
              total: 3,
              timestamp: expect.any(String),
            },
          });
          expect(result.metadata.total).toBe(3);
          done();
        },
      });
    });

    it('should preserve ApiResponse format if already formatted', (done) => {
      const apiResponse: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 1 },
        metadata: {
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      };
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(apiResponse));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toBe(apiResponse);
          expect(result.success).toBe(true);
          done();
        },
      });
    });

    it('should wrap simple message objects', (done) => {
      const messageData = { message: 'Success message' };
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(messageData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: messageData,
            metadata: {
              timestamp: expect.any(String),
            },
          });
          expect(result.data.message).toBe('Success message');
          done();
        },
      });
    });

    it('should handle paginated responses', (done) => {
      const paginatedData = {
        data: [{ id: 1 }, { id: 2 }],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      };
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(paginatedData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: paginatedData.data,
            pagination: paginatedData.pagination,
            metadata: {
              timestamp: expect.any(String),
            },
          });
          expect(result.pagination).toEqual(paginatedData.pagination);
          done();
        },
      });
    });

    it('should handle string responses', (done) => {
      const stringData = 'Simple string response';
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(stringData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: stringData,
            metadata: {
              timestamp: expect.any(String),
            },
          });
          done();
        },
      });
    });

    it('should handle number responses', (done) => {
      const numberData = 42;
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(numberData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: numberData,
            metadata: {
              timestamp: expect.any(String),
            },
          });
          done();
        },
      });
    });

    it('should handle null responses', (done) => {
      const nullData = null;
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(nullData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: nullData,
            metadata: {
              timestamp: expect.any(String),
            },
          });
          done();
        },
      });
    });

    it('should handle empty array responses', (done) => {
      const emptyArray: any[] = [];
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(emptyArray));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: emptyArray,
            metadata: {
              total: 0,
              timestamp: expect.any(String),
            },
          });
          expect(result.metadata.total).toBe(0);
          done();
        },
      });
    });

    it('should not wrap objects with message and other properties as simple messages', (done) => {
      const complexMessage = {
        message: 'Success',
        code: 'SUCCESS',
        details: { extra: 'data' },
      };
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(complexMessage));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: complexMessage,
            metadata: {
              timestamp: expect.any(String),
            },
          });
          expect(result.data).toEqual(complexMessage);
          done();
        },
      });
    });

    it('should generate ISO timestamp in metadata', (done) => {
      const data = { test: 'data' };
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(data));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          const timestamp = result.metadata.timestamp;
          expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          expect(new Date(timestamp).toISOString()).toBe(timestamp);
          done();
        },
      });
    });
  });
});
