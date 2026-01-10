import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { MinioService, FileUploadResult } from './minio.service';
import * as Minio from 'minio';

// Mock Minio client
jest.mock('minio', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      setBucketPolicy: jest.fn(),
      putObject: jest.fn(),
      removeObject: jest.fn(),
      presignedGetObject: jest.fn(),
      listObjects: jest.fn(),
      statObject: jest.fn(),
    })),
  };
});

describe('MinioService', () => {
  let service: MinioService;
  let configService: ConfigService;
  let mockMinioClient: any;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: '9000',
        MINIO_USE_SSL: 'false',
        MINIO_ACCESS_KEY: 'minio',
        MINIO_SECRET_KEY: 'minio123',
        NODE_ENV: 'development',
        THUMBNAIL_MAX_SIZE_MB: '5',
        MEDIA_MAX_SIZE_MB: '2048',
        ATTACHMENT_MAX_SIZE_MB: '100',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MinioService>(MinioService);
    configService = module.get<ConfigService>(ConfigService);

    // Get the mocked Minio client instance
    mockMinioClient = (service as any).minioClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    const mockFile = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('test'),
    };

    it('should upload file successfully', async () => {
      mockMinioClient.putObject.mockResolvedValue(undefined);
      mockMinioClient.presignedGetObject.mockResolvedValue(
        'http://localhost:9000/thumbnails/2024/01/01/test.jpg',
      );

      const result = await service.uploadFile('thumbnails', mockFile);

      expect(mockMinioClient.putObject).toHaveBeenCalled();
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('bucket', 'thumbnails');
      expect(result).toHaveProperty('size', 1024);
      expect(result).toHaveProperty('originalName', 'test.jpg');
    });

    it('should throw BadRequestException when file is not provided', async () => {
      await expect(service.uploadFile('thumbnails', null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when file is empty', async () => {
      const emptyFile = { ...mockFile, size: 0 };

      await expect(service.uploadFile('thumbnails', emptyFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when file size exceeds maxSize', async () => {
      const largeFile = {
        ...mockFile,
        size: 10 * 1024 * 1024, // 10MB
      };

      await expect(
        service.uploadFile('thumbnails', largeFile, undefined, {
          maxSize: 5 * 1024 * 1024, // 5MB max
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file type is not allowed', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/pdf',
      };

      await expect(
        service.uploadFile('thumbnails', invalidFile, undefined, {
          allowedTypes: ['image/jpeg', 'image/png'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use custom path when provided', async () => {
      mockMinioClient.putObject.mockResolvedValue(undefined);
      mockMinioClient.presignedGetObject.mockResolvedValue(
        'http://localhost:9000/thumbnails/custom/path/test.jpg',
      );

      await service.uploadFile('thumbnails', mockFile, 'custom/path/test.jpg');

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'thumbnails',
        'custom/path/test.jpg',
        mockFile.buffer,
        mockFile.size,
        expect.any(Object),
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockMinioClient.removeObject.mockResolvedValue(undefined);

      await service.deleteFile('thumbnails', 'path/to/file.jpg');

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('thumbnails', 'path/to/file.jpg');
    });

    it('should throw BadRequestException when deletion fails', async () => {
      mockMinioClient.removeObject.mockRejectedValue(new Error('File not found'));

      await expect(service.deleteFile('thumbnails', 'path/to/file.jpg')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL', async () => {
      const expectedUrl = 'http://localhost:9000/thumbnails/test.jpg?token=abc123';
      mockMinioClient.presignedGetObject.mockResolvedValue(expectedUrl);

      const result = await service.getPresignedUrl('thumbnails', 'test.jpg', 3600);

      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'thumbnails',
        'test.jpg',
        3600,
      );
      expect(result).toBe(expectedUrl);
    });

    it('should use default expiry when not provided', async () => {
      mockMinioClient.presignedGetObject.mockResolvedValue('url');

      await service.getPresignedUrl('thumbnails', 'test.jpg');

      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'thumbnails',
        'test.jpg',
        3600,
      );
    });
  });

  describe('getFileUrl', () => {
    it('should return public URL in development', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'MINIO_ENDPOINT') return 'localhost';
        if (key === 'MINIO_PORT') return '9000';
        return undefined;
      });

      const result = await service.getFileUrl('thumbnails', 'test.jpg');

      expect(result).toContain('http://localhost:9000/thumbnails/test.jpg');
    });

    it('should return presigned URL in production', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });
      mockMinioClient.presignedGetObject.mockResolvedValue('presigned-url');

      const result = await service.getFileUrl('media', 'test.jpg');

      expect(mockMinioClient.presignedGetObject).toHaveBeenCalled();
      expect(result).toBe('presigned-url');
    });
  });

  describe('listFiles', () => {
    it('should list files in bucket', async () => {
      const mockFiles = [
        { name: 'file1.jpg', size: 1024 },
        { name: 'file2.jpg', size: 2048 },
      ];

      const mockStream = {
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            mockFiles.forEach((file) => handler(file));
          }
          if (event === 'end') {
            setTimeout(() => handler(), 0);
          }
          return mockStream;
        }),
      };

      mockMinioClient.listObjects.mockReturnValue(mockStream);

      const result = await service.listFiles('thumbnails', 'prefix');

      expect(mockMinioClient.listObjects).toHaveBeenCalledWith('thumbnails', 'prefix', true);
      expect(result).toEqual(mockFiles);
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockMinioClient.statObject.mockResolvedValue({});

      const result = await service.fileExists('thumbnails', 'test.jpg');

      expect(mockMinioClient.statObject).toHaveBeenCalledWith('thumbnails', 'test.jpg');
      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockMinioClient.statObject.mockRejectedValue(new Error('Not found'));

      const result = await service.fileExists('thumbnails', 'test.jpg');

      expect(result).toBe(false);
    });
  });

  describe('getValidationOptions', () => {
    it('should return validation options for thumbnail', () => {
      const options = service.getValidationOptions('thumbnail');

      expect(options.allowedTypes).toContain('image/jpeg');
      expect(options.allowedTypes).toContain('image/png');
      expect(options.maxSize).toBeDefined();
    });

    it('should return validation options for media', () => {
      const options = service.getValidationOptions('media');

      expect(options.allowedTypes).toContain('video/mp4');
      expect(options.allowedTypes).toContain('image/png'); // For sequences/storyboards
      expect(options.allowedTypes).toContain('text/plain'); // For prompts
      expect(options.maxSize).toBeDefined();
    });

    it('should return validation options for attachment', () => {
      const options = service.getValidationOptions('attachment');

      expect(options.allowedTypes).toContain('application/pdf');
      expect(options.maxSize).toBeDefined();
    });
  });
});
