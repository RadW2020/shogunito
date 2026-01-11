import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

export interface FileUploadResult {
  url: string;
  path: string;
  bucket: string;
  size: number;
  originalName: string;
}

export interface FileValidationOptions {
  allowedTypes?: string[];
  maxSize?: number; // in bytes
  required?: boolean;
}

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private readonly minioClient: Minio.Client;
  private readonly publicMinioClient: Minio.Client | null;
  private readonly bucketNames = {
    thumbnails: 'thumbnails',
    media: 'media',
    attachments: 'attachments',
  };

  constructor(private configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000')),
      useSSL: this.configService.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY', 'minio'),
      secretKey: this.configService.get('MINIO_SECRET_KEY', 'minio123'),
    });

    // Create a public client for generating presigned URLs with public hostname
    const publicEndpoint = this.configService.get<string>('MINIO_PUBLIC_ENDPOINT');
    if (publicEndpoint) {
      try {
        const publicUrl = new URL(
          publicEndpoint.startsWith('http') ? publicEndpoint : `https://${publicEndpoint}`,
        );
        this.publicMinioClient = new Minio.Client({
          endPoint: publicUrl.hostname,
          port: publicUrl.port
            ? parseInt(publicUrl.port)
            : publicUrl.protocol === 'https:'
              ? 443
              : 80,
          useSSL: publicUrl.protocol === 'https:',
          accessKey: this.configService.get('MINIO_ACCESS_KEY', 'minio'),
          secretKey: this.configService.get('MINIO_SECRET_KEY', 'minio123'),
        });
        this.logger.log(`Public MinIO client configured for ${publicEndpoint}`);
      } catch (error) {
        this.logger.warn(`Failed to create public MinIO client: ${error.message}`);
        this.publicMinioClient = null;
      }
    } else {
      this.publicMinioClient = null;
    }

    this.initializeBuckets();
    // Configure CORS (don't block initialization)
    this.configureCors();
  }

  private getMaxSizeInBytes(envKey: string, defaultMb: number): number {
    const value = this.configService.get(envKey);
    const parsed = value ? parseInt(value, 10) : defaultMb;
    const sizeInMb = Number.isNaN(parsed) ? defaultMb : parsed;
    return sizeInMb * 1024 * 1024;
  }

  private async initializeBuckets(): Promise<void> {
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        for (const bucketName of Object.values(this.bucketNames)) {
          const exists = await this.minioClient.bucketExists(bucketName);
          if (!exists) {
            await this.minioClient.makeBucket(bucketName, 'us-east-1');
            this.logger.log(`Created bucket: ${bucketName}`);
          }

          // Set bucket policy to allow public read access
          await this.setBucketPublicPolicy(bucketName);
        }
        // Success - exit retry loop
        this.logger.log('MinIO buckets initialized successfully');
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          this.logger.error(`Failed to initialize buckets after ${maxRetries} attempts:`, error);
          return;
        }
        this.logger.warn(
          `Failed to initialize buckets (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  /**
   * Set bucket policy to allow public read access
   */
  private async setBucketPublicPolicy(bucketName: string): Promise<void> {
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };

      await this.minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      this.logger.log(`Set public read policy for bucket: ${bucketName}`);
    } catch (error) {
      this.logger.warn(`Failed to set public policy for bucket ${bucketName}:`, error.message);
    }
  }

  /**
   * Configure CORS for MinIO using the admin API
   * This uses the MinIO admin REST API to set CORS configuration
   */
  private configureCors(): void {
    try {
      // Get allowed origins from environment
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const allowedOrigins = this.configService.get<string>('ALLOWED_ORIGINS');

      // Build list of allowed origins
      const origins: string[] = [];
      if (frontendUrl) {
        origins.push(...frontendUrl.split(',').map((origin) => origin.trim()));
      }
      if (allowedOrigins) {
        origins.push(...allowedOrigins.split(',').map((origin) => origin.trim()));
      }

      // If no origins configured, allow all (for development)
      const corsOrigins = origins.length > 0 ? origins.join(',') : '*';

      // MinIO admin API endpoint for CORS configuration
      // Note: This requires MinIO to have admin API enabled
      // The CORS configuration is typically done via mc (MinIO Client) tool
      // For now, we'll log a message indicating CORS should be configured manually
      this.logger.log(`CORS configuration: Allowed origins: ${corsOrigins}`);
      this.logger.warn(
        `CORS must be configured manually using mc: mc admin config set minio api cors_allow_origin="${corsOrigins}"`,
      );
    } catch (error) {
      this.logger.warn(`Failed to configure CORS: ${error.message}`);
    }
  }

  /**
   * Upload a file to MinIO
   */
  async uploadFile(
    bucket: keyof typeof this.bucketNames,
    file: any,
    path?: string,
    options?: FileValidationOptions,
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      this.validateFile(file, options);

      // Generate path if not provided
      const filePath = path || this.generateFilePath(file.originalname);
      const bucketName = this.bucketNames[bucket];

      // Determine cache duration based on bucket type
      // Thumbnails can be cached longer since they rarely change
      // Media files can be cached but with shorter duration
      const isThumbnail = bucket === 'thumbnails';
      const cacheMaxAge = isThumbnail ? 31536000 : 604800; // 1 year for thumbnails, 1 week for media
      const cacheControl = `public, max-age=${cacheMaxAge}, immutable`;

      // Upload file with cache headers
      await this.minioClient.putObject(bucketName, filePath, file.buffer, file.size, {
        'Content-Type': file.mimetype,
        'Original-Name': file.originalname,
        'Cache-Control': cacheControl,
        Expires: new Date(Date.now() + cacheMaxAge * 1000).toUTCString(),
      });

      this.logger.log(`File uploaded successfully: ${filePath} to bucket ${bucketName}`);

      // Return path only - URL will be generated on-demand when needed
      return {
        url: `${bucketName}/${filePath}`, // Keep for backward compatibility, but prefer using path
        path: filePath,
        bucket: bucketName,
        size: file.size,
        originalName: file.originalname,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from MinIO
   */
  async deleteFile(bucket: keyof typeof this.bucketNames, path: string): Promise<void> {
    try {
      const bucketName = this.bucketNames[bucket];
      await this.minioClient.removeObject(bucketName, path);
      this.logger.log(`File deleted successfully: ${path} from bucket ${bucketName}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw new BadRequestException(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Get a presigned URL for file access
   */
  async getPresignedUrl(
    bucket: keyof typeof this.bucketNames,
    path: string,
    expiry: number = 3600, // 1 hour default
  ): Promise<string> {
    try {
      const bucketName = this.bucketNames[bucket];

      // Use public client if available, otherwise use internal client
      const client = this.publicMinioClient || this.minioClient;

      const presignedUrl = await client.presignedGetObject(bucketName, path, expiry);

      return presignedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`);
      throw new BadRequestException(`Failed to generate file URL: ${error.message}`);
    }
  }

  /**
   * Get public URL for a file
   */
  async getFileUrl(bucket: string, path: string): Promise<string> {
    const publicEndpoint = this.configService.get<string>('MINIO_PUBLIC_ENDPOINT');

    // For thumbnails bucket, always use direct public URLs (bucket is configured as public)
    // For other buckets in production, use presigned URLs for security
    const isPublicBucket = bucket === 'thumbnails';
    const isDevelopment = this.configService.get('NODE_ENV', 'development') === 'development';

    if (isDevelopment || isPublicBucket) {
      // Use direct public URL for development or public buckets
      if (publicEndpoint) {
        // Use public endpoint (e.g., https://shogunitominio.uliber.com)
        const baseUrl = publicEndpoint.startsWith('http')
          ? publicEndpoint
          : `https://${publicEndpoint}`;
        return `${baseUrl}/${bucket}/${path}`;
      } else {
        // Fallback to local endpoint
        const endpoint = this.configService.get('MINIO_ENDPOINT', 'localhost');
        const port = this.configService.get('MINIO_PORT', '9000');
        const baseUrl = `http://${endpoint}:${port}`;
        return `${baseUrl}/${bucket}/${path}`;
      }
    } else {
      // Use presigned URL for non-public buckets in production
      return await this.getPresignedUrl(bucket as keyof typeof this.bucketNames, path, 3600 * 24); // 24 hours
    }
  }

  /**
   * List files in a bucket with optional prefix
   */
  async listFiles(bucket: keyof typeof this.bucketNames, prefix?: string): Promise<any[]> {
    try {
      const bucketName = this.bucketNames[bucket];
      const files: any[] = [];

      const stream = this.minioClient.listObjects(bucketName, prefix, true);

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => files.push(obj));
        stream.on('error', reject);
        stream.on('end', () => resolve(files));
      });
    } catch (error) {
      this.logger.error(`Failed to list files: ${error.message}`);
      throw new BadRequestException(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(bucket: keyof typeof this.bucketNames, path: string): Promise<boolean> {
    try {
      const bucketName = this.bucketNames[bucket];
      await this.minioClient.statObject(bucketName, path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update cache headers for an existing file
   * Uses copyObject to update metadata without re-uploading the file
   */
  async updateFileCacheHeaders(bucket: keyof typeof this.bucketNames, path: string): Promise<void> {
    try {
      const bucketName = this.bucketNames[bucket];

      // Get existing object metadata
      const stat = await this.minioClient.statObject(bucketName, path);

      // Determine cache duration based on bucket type
      const isThumbnail = bucket === 'thumbnails';
      const cacheMaxAge = isThumbnail ? 31536000 : 604800; // 1 year for thumbnails, 1 week for media
      const cacheControl = `public, max-age=${cacheMaxAge}, immutable`;

      // Prepare new metadata, preserving existing metadata
      const existingMetadata = stat.metaData || {};
      const newMetadata: Record<string, string> = {
        ...existingMetadata,
        'Cache-Control': cacheControl,
        Expires: new Date(Date.now() + cacheMaxAge * 1000).toUTCString(),
      };

      // Ensure Content-Type is preserved
      if (stat.metaData?.['content-type']) {
        newMetadata['Content-Type'] = stat.metaData['content-type'];
      } else if (stat.metaData?.['Content-Type']) {
        newMetadata['Content-Type'] = stat.metaData['Content-Type'];
      }

      // Use copyObject to update metadata by copying object to itself
      // MinIO copyObject signature: copyObject(bucketName, objectName, sourceObject, conditions?, metadata?)
      // Note: The native minio types don't include setReplaceMetadataDirective or the 5th metadata parameter,
      // but these exist at runtime in minio@8.0.6
      const copyConditions = new Minio.CopyConditions();

      // Set metadata directive to REPLACE to replace existing metadata with new metadata
      // Type assertion needed because method exists at runtime but not in type definitions
      (copyConditions as any).setReplaceMetadataDirective();

      // Copy object to itself with new metadata
      // Type assertion needed because 5th parameter exists at runtime but not in type definitions
      await (this.minioClient.copyObject as any)(
        bucketName,
        path,
        `/${bucketName}/${path}`,
        copyConditions,
        newMetadata,
      );

      this.logger.log(`Updated cache headers for ${bucketName}/${path}`);
    } catch (error) {
      this.logger.error(`Failed to update cache headers for ${path}: ${error.message}`);
      throw new BadRequestException(`Failed to update cache headers: ${error.message}`);
    }
  }

  /**
   * Update cache headers for all files in a bucket
   * Useful for migrating existing files to have cache headers
   */
  async updateAllFilesCacheHeaders(bucket: keyof typeof this.bucketNames): Promise<{
    total: number;
    updated: number;
    failed: number;
  }> {
    const bucketName = this.bucketNames[bucket];
    let total = 0;
    let updated = 0;
    let failed = 0;

    try {
      this.logger.log(`Starting cache headers update for bucket: ${bucketName}`);

      const files = await this.listFiles(bucket);
      total = files.length;

      for (const file of files) {
        try {
          // MinIO listObjects returns objects with 'name' property
          const fileName = file.name || file;
          if (typeof fileName === 'string') {
            await this.updateFileCacheHeaders(bucket, fileName);
            updated++;
          }
        } catch (error) {
          const fileName = file.name || file;
          this.logger.warn(`Failed to update cache headers for ${fileName}: ${error.message}`);
          failed++;
        }
      }

      this.logger.log(
        `Cache headers update completed for ${bucketName}: ${updated}/${total} updated, ${failed} failed`,
      );

      return { total, updated, failed };
    } catch (error) {
      this.logger.error(
        `Failed to update cache headers for bucket ${bucketName}: ${error.message}`,
      );
      throw new BadRequestException(`Failed to update cache headers: ${error.message}`);
    }
  }

  /**
   * Validate file according to options
   */
  private validateFile(file: any, options?: FileValidationOptions): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size === 0) {
      throw new BadRequestException('File is empty');
    }

    if (options?.required && !file.buffer) {
      throw new BadRequestException('File is required');
    }

    if (options?.maxSize && file.size > options.maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.formatFileSize(options.maxSize)}`,
      );
    }

    if (options?.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
      );
    }
  }

  /**
   * Generate a unique file path
   */
  private generateFilePath(originalName: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const fileName = `${timestamp}-${randomId}.${extension}`;

    // Organize by date
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}/${month}/${day}/${fileName}`;
  }

  /**
   * Format file size for human reading
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Extract bucket and path from a MinIO URL or path
   * Handles:
   * - Full URLs (presigned or direct): https://host/bucket/path
   * - Paths with bucket prefix: bucket/path
   * - Simple paths: path (requires bucket parameter)
   */
  extractBucketAndPath(
    urlOrPath: string,
    defaultBucket?: 'thumbnails' | 'media' | 'attachments',
  ): {
    bucket: 'thumbnails' | 'media' | 'attachments';
    path: string;
  } | null {
    try {
      // Try parsing as URL first
      try {
        const urlObj = new URL(urlOrPath);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        if (pathParts.length < 2) return null;

        const bucket = pathParts[0] as 'thumbnails' | 'media' | 'attachments';
        if (!['thumbnails', 'media', 'attachments'].includes(bucket)) {
          return null;
        }

        const path = pathParts.slice(1).join('/');
        return { bucket, path };
      } catch {
        // Not a URL, try as path
      }

      // Check if it's a path with bucket prefix (bucket/path)
      const pathParts = urlOrPath.split('/');
      if (pathParts.length >= 2 && ['thumbnails', 'media', 'attachments'].includes(pathParts[0])) {
        const bucket = pathParts[0] as 'thumbnails' | 'media' | 'attachments';
        const path = pathParts.slice(1).join('/');
        return { bucket, path };
      }

      // Simple path - use default bucket if provided
      if (defaultBucket) {
        return { bucket: defaultBucket, path: urlOrPath };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get file validation options by file type
   */
  getValidationOptions(fileType: 'thumbnail' | 'media' | 'attachment'): FileValidationOptions {
    switch (fileType) {
      case 'thumbnail':
        return {
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maxSize: this.getMaxSizeInBytes('THUMBNAIL_MAX_SIZE_MB', 5),
        };
      case 'media':
        return {
          allowedTypes: [
            'image/x-exr',
            'image/png', // For sequences/storyboards
            'image/jpeg',
            'image/webp',
            'text/plain', // For prompts
            'application/octet-stream', // For .exr files
          ],
          maxSize: this.getMaxSizeInBytes('MEDIA_MAX_SIZE_MB', 2048),
        };
      case 'attachment':
        return {
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'],
          maxSize: this.getMaxSizeInBytes('ATTACHMENT_MAX_SIZE_MB', 100),
        };
      default:
        return {};
    }
  }
}
