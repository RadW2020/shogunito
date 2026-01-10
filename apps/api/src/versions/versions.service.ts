import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import type { File } from 'multer';
import { CreateVersionDto, VersionEntityType } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { CreateAssetWithVersionDto } from './dto/create-asset-with-version.dto';
import { CreatePlaylistWithVersionDto } from './dto/create-playlist-with-version.dto';
import { CreateSequenceWithVersionDto } from './dto/create-sequence-with-version.dto';
import { MinioService } from '../files/minio.service';
import { ImageOptimizationService } from '../files/image-optimization.service';
import { SlackService } from '../notifications/slack/slack.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Version, Asset, Playlist, Sequence, Status, ProjectRole } from '../entities';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';

@Injectable()
export class VersionsService {
  constructor(
    @InjectRepository(Version)
    private versionsRepository: Repository<Version>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(Playlist)
    private playlistRepository: Repository<Playlist>,
    @InjectRepository(Sequence)
    private sequenceRepository: Repository<Sequence>,
    @InjectRepository(Status)
    private statusRepository: Repository<Status>,
    private dataSource: DataSource,
    private minioService: MinioService,
    private imageOptimizationService: ImageOptimizationService,
    private slackService: SlackService,
    private notificationsService: NotificationsService,
    private projectAccessService: ProjectAccessService,
  ) {}

  /**
   * Helper method to get statusId by status code
   */
  private async getStatusIdByCode(statusCode?: string): Promise<string | null> {
    if (!statusCode) return null;
    const status = await this.statusRepository.findOne({
      where: { code: statusCode },
    });
    return status?.id || null;
  }

  /**
   * Helper method to get status code by statusId
   */
  private async getStatusCodeById(statusId?: string): Promise<string | null> {
    if (!statusId) return null;
    const status = await this.statusRepository.findOne({
      where: { id: statusId },
    });
    return status?.code || null;
  }

  /**
   * Transform version to include status code for frontend compatibility
   * Also regenerates file URLs to ensure they don't expire
   */
  private async transformVersion(version: any): Promise<any> {
    // Use the loaded status relation if available, otherwise fetch it
    const statusCode = version.status?.code
      ? version.status.code
      : version.statusId
        ? await this.getStatusCodeById(version.statusId)
        : null;

    // Regenerate file URLs only if needed (for presigned URLs that expire)
    // For public URLs (thumbnails), keep them as-is to allow browser caching
    let filePath = version.filePath;
    let thumbnailPath = version.thumbnailPath;

    // Check if filePath is already a full URL or needs regeneration
    if (version.filePath && !version.filePath.startsWith('http')) {
      try {
        // Only regenerate if it's a path, not a full URL
        const fileInfo = this.minioService.extractBucketAndPath(version.filePath, 'media');
        if (fileInfo) {
          filePath = await this.minioService.getFileUrl(fileInfo.bucket, fileInfo.path);
        }
      } catch (error) {
        // Log error but don't fail - keep original path/URL
        console.warn(`Failed to regenerate filePath URL for version ${version.id}:`, error);
      }
    }

    // For thumbnails, if it's already a public URL, keep it to preserve browser cache
    // Only regenerate if it's a path or if it's a presigned URL that might expire
    if (version.thumbnailPath) {
      const isPublicUrl = version.thumbnailPath.startsWith('http');
      const isPresignedUrl = version.thumbnailPath.includes('?X-Amz-Algorithm') || 
                            version.thumbnailPath.includes('?AWSAccessKeyId');
      
      // Only regenerate if it's a path or a presigned URL (which expires)
      if (!isPublicUrl || isPresignedUrl) {
        try {
          const thumbnailInfo = this.minioService.extractBucketAndPath(
            version.thumbnailPath,
            'thumbnails',
          );
          if (thumbnailInfo) {
            thumbnailPath = await this.minioService.getFileUrl(
              thumbnailInfo.bucket,
              thumbnailInfo.path,
            );
          }
        } catch (error) {
          // Log error but don't fail - keep original path/URL
          console.warn(`Failed to regenerate thumbnailPath URL for version ${version.id}:`, error);
        }
      }
    }

    return {
      ...version,
      status: statusCode || null,
      filePath,
      thumbnailPath,
    };
  }

  async create(createVersionDto: CreateVersionDto, userContext?: UserContext): Promise<Version> {
    // Validate that either entityCode or entityId is provided
    if (!createVersionDto.entityCode && !createVersionDto.entityId) {
      throw new BadRequestException('Either entityCode or entityId must be provided');
    }

    if (!createVersionDto.entityType) {
      throw new BadRequestException('entityType must be provided');
    }

    // Check for duplicate code
    if (createVersionDto.code) {
      const existingVersion = await this.versionsRepository.findOne({
        where: { code: createVersionDto.code },
      });
      if (existingVersion) {
        throw new ConflictException(`Version with code '${createVersionDto.code}' already exists`);
      }
    }

    // Determine which identifier to use (entityId for migrated entities, entityCode for others)
    const useEntityId = createVersionDto.entityId !== undefined;

    // Validate entity existence and verify access
    if (useEntityId && createVersionDto.entityId !== undefined) {
      let entityExists = false;
      switch (createVersionDto.entityType) {
        case VersionEntityType.ASSET:
          entityExists = await this.assetRepository.exist({
            where: { id: createVersionDto.entityId },
          });
          break;
        case VersionEntityType.SEQUENCE:
          entityExists = await this.sequenceRepository.exist({
            where: { id: createVersionDto.entityId },
          });
          break;
        case VersionEntityType.PLAYLIST:
          entityExists = await this.playlistRepository.exist({
            where: { id: createVersionDto.entityId },
          });
          break;
        default:
          break;
      }

      if (!entityExists) {
        throw new NotFoundException(
          `${createVersionDto.entityType} with ID ${createVersionDto.entityId} not found`,
        );
      }

      // Verify user has contributor access to the project
      if (userContext) {
        await this.projectAccessService.verifyVersionAccess(
          {
            entityId: createVersionDto.entityId,
            entityType: createVersionDto.entityType,
          },
          userContext,
          ProjectRole.CONTRIBUTOR,
        );
      }
    } else if (createVersionDto.entityCode) {
      // Legacy validation by code if needed, but migration suggests we use IDs
      // We can skip or implement similar logic if repositories support finding by code
    }

    // Find the highest version number for this entity
    interface MaxVersionResult {
      maxVersion: string | null;
    }
    let maxVersionResult: MaxVersionResult | null = null;

    if (useEntityId && createVersionDto.entityId !== undefined) {
      maxVersionResult = (await this.versionsRepository
        .createQueryBuilder('version')
        .select('MAX(version.versionNumber)', 'maxVersion')
        .where('version.entityId = :entityId AND version.entityType = :entityType', {
          entityId: createVersionDto.entityId,
          entityType: createVersionDto.entityType,
        })
        .getRawOne()) as unknown as MaxVersionResult | null;
    } else {
      maxVersionResult = (await this.versionsRepository
        .createQueryBuilder('version')
        .select('MAX(version.versionNumber)', 'maxVersion')
        .where('version.entityCode = :entityCode AND version.entityType = :entityType', {
          entityCode: createVersionDto.entityCode,
          entityType: createVersionDto.entityType,
        })
        .getRawOne()) as unknown as MaxVersionResult | null;
    }

    const nextVersionNumber =
      (maxVersionResult?.maxVersion ? parseInt(maxVersionResult.maxVersion, 10) : 0) + 1;

    // Determine if this version should be latest (default true for new versions)
    const shouldBeLatest = createVersionDto.latest !== false;

    // If marking as latest, unmark all other latest versions for the same entity
    if (shouldBeLatest) {
      if (useEntityId && createVersionDto.entityId !== undefined) {
        const raw = await this.versionsRepository.query(
          'SELECT * FROM versions WHERE entity_id = $1',
          [createVersionDto.entityId],
        );
        console.log('DEBUG: Raw versions:', raw);

        const existing = await this.versionsRepository.find({
          where: { entityId: createVersionDto.entityId },
        });
        console.log(
          'DEBUG: Existing versions for entityId',
          createVersionDto.entityId,
          ':',
          existing.map((v) => ({
            id: v.id,
            latest: v.latest,
            type: v.entityType,
          })),
        );

        console.log(
          'DEBUG: Updating latest versions for entityId:',
          createVersionDto.entityId,
          'type:',
          createVersionDto.entityType,
        );
        const updateResult = await this.versionsRepository.update(
          {
            entityId: createVersionDto.entityId,
            entityType: createVersionDto.entityType,
            latest: true,
          },
          { latest: false },
        );
        console.log('DEBUG: Update result:', updateResult);
      } else {
        await this.versionsRepository.update(
          {
            entityCode: createVersionDto.entityCode,
            entityType: createVersionDto.entityType,
            latest: true,
          },
          { latest: false },
        );
      }
    }

    // Get statusId from status code if provided
    const statusId = createVersionDto.status
      ? await this.getStatusIdByCode(createVersionDto.status)
      : await this.getStatusIdByCode('wip'); // Default to wip

    const version = this.versionsRepository.create({
      code: createVersionDto.code,
      name: createVersionDto.name,
      description: createVersionDto.description,
      versionNumber: nextVersionNumber,
      format: createVersionDto.format,
      statusId: statusId,
      filePath: createVersionDto.filePath,
      thumbnailPath: createVersionDto.thumbnailPath,
      artist: createVersionDto.artist,
      createdBy: userContext?.userId || null,
      assignedTo: createVersionDto.assignedTo,
      latest: shouldBeLatest,
      entityCode: createVersionDto.entityCode,
      entityId: createVersionDto.entityId,
      entityType: createVersionDto.entityType,
      statusUpdatedAt: new Date(), // Initialize statusUpdatedAt when creating
    });

    const savedVersion = await this.versionsRepository.save(version, {
      reload: true,
    });
    console.log('DEBUG: Saved version (reloaded):', savedVersion);

    // Transform version to include status code
    return await this.transformVersion(savedVersion);
  }

  async findAll(
    entityCode?: string,
    entityType?: string,
    latest?: boolean,
    entityId?: number,
    userContext?: UserContext,
  ): Promise<Version[]> {
    const queryBuilder = this.versionsRepository
      .createQueryBuilder('version')
      .leftJoinAndSelect('version.status', 'status');

    if (entityId !== undefined) {
      queryBuilder.andWhere('version.entityId = :entityId', { entityId });
    }

    if (entityCode) {
      queryBuilder.andWhere('version.entityCode = :entityCode', { entityCode });
    }

    if (entityType) {
      queryBuilder.andWhere('version.entityType = :entityType', { entityType });
    }

    if (latest !== undefined) {
      queryBuilder.andWhere('version.latest = :latest', { latest });
    }

    queryBuilder.orderBy('version.createdAt', 'DESC');

    const versions = await queryBuilder.getMany();

    // Filter by user's accessible projects (unless admin)
    let filteredVersions = versions;
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds = await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return [];
      }

      // Filter versions by checking if their associated entity's project is accessible
      filteredVersions = [];
      for (const version of versions) {
        if (version.entityId && version.entityType) {
          const projectId = await this.projectAccessService.getProjectIdFromVersion({
            entityId: version.entityId,
            entityType: version.entityType,
          });
          if (projectId && accessibleProjectIds.includes(projectId)) {
            filteredVersions.push(version);
          }
        } else {
          // If no entityId or entityType, skip (shouldn't happen in normal flow)
          continue;
        }
      }
    }

    // Transform versions to include status code
    const transformedVersions = [];
    for (const version of filteredVersions) {
      transformedVersions.push(await this.transformVersion(version));
    }

    return transformedVersions;
  }

  async findByEntity(entityCode: string, entityType: string): Promise<Version[]> {
    const versions = await this.versionsRepository.find({
      where: { entityCode, entityType },
      order: { createdAt: 'DESC' },
    });

    return versions;
  }

  async findOneById(id: number, userContext?: UserContext): Promise<Version> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid version ID');
    }

    const version = await this.versionsRepository.findOne({
      where: { id },
      relations: ['status'],
    });

    if (!version) {
      throw new NotFoundException(`Version with ID ${id} not found`);
    }

    // Verify user has access to this version's project
    if (userContext && version.entityId && version.entityType) {
      await this.projectAccessService.verifyVersionAccess(
        { entityId: version.entityId, entityType: version.entityType },
        userContext,
      );
    }

    // Transform version to include status code
    return await this.transformVersion(version);
  }

  async findOne(code: string, userContext?: UserContext): Promise<Version> {
    const version = await this.versionsRepository.findOne({
      where: { code },
      relations: ['status'],
    });

    if (!version) {
      throw new NotFoundException(`Version with code ${code} not found`);
    }

    // Verify user has access to this version's project
    if (userContext && version.entityId && version.entityType) {
      await this.projectAccessService.verifyVersionAccess(
        { entityId: version.entityId, entityType: version.entityType },
        userContext,
      );
    }

    // Transform version to include status code
    return await this.transformVersion(version);
  }

  async update(id: number, updateVersionDto: UpdateVersionDto, userContext?: UserContext): Promise<Version> {
    // Get current version to check if status is changing
    const currentVersion = await this.versionsRepository.findOne({
      where: { id },
      relations: ['status'],
    });

    if (!currentVersion) {
      throw new NotFoundException(`Version with ID ${id} not found`);
    }

    // Verify user has contributor access
    if (userContext && currentVersion.entityId && currentVersion.entityType) {
      await this.projectAccessService.verifyVersionAccess(
        { entityId: currentVersion.entityId, entityType: currentVersion.entityType },
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }
    const currentStatusId = currentVersion.statusId || null;

    // Determine new statusId from either statusId or status code
    let newStatusId: string | null = null;
    if (updateVersionDto.statusId) {
      newStatusId = updateVersionDto.statusId;
    } else if (updateVersionDto.status) {
      newStatusId = await this.getStatusIdByCode(updateVersionDto.status);
    }

    const isStatusChanging = newStatusId && newStatusId !== currentStatusId;

    // If marking as latest, unmark all other latest versions for the same entity
    if (updateVersionDto.latest) {
      // Unmark all other latest versions for the same entity
      if (currentVersion.entityId !== undefined && currentVersion.entityId !== null) {
        await this.versionsRepository.update(
          {
            entityId: currentVersion.entityId,
            entityType: currentVersion.entityType,
            latest: true,
            id: Not(id),
          },
          { latest: false },
        );
      } else if (currentVersion.entityCode) {
        await this.versionsRepository.update(
          {
            entityCode: currentVersion.entityCode,
            entityType: currentVersion.entityType,
            latest: true,
            id: Not(id),
          },
          { latest: false },
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...updateVersionDto };
    delete updateData.status; // Remove status from updateData

    // Handle status update: accept either statusId directly or status code
    if (updateVersionDto.statusId) {
      // If statusId is provided directly, use it
      updateData.statusId = updateVersionDto.statusId;
    } else if (updateVersionDto.status) {
      // If status code is provided, convert to statusId
      const statusId = await this.getStatusIdByCode(updateVersionDto.status);
      updateData.statusId = statusId;
    }

    // If status is changing, update statusUpdatedAt
    if (isStatusChanging) {
      updateData.statusUpdatedAt = new Date();
    }

    await this.versionsRepository.update(id, updateData);
    const updatedVersion = await this.findOneById(id, userContext);

    // Send notifications for status changes
    if (isStatusChanging) {
      await this.handleVersionStatusChange(
        currentVersion,
        updatedVersion,
        null, // updatedBy not available in update method, will use 'System' for Slack
      );
    }

    return updatedVersion;
  }

  /**
   * Handle notifications when version status changes
   */
  private async handleVersionStatusChange(
    previousVersion: Version,
    updatedVersion: Version,
    changedBy: number | null,
  ): Promise<void> {
    const newStatusCode = updatedVersion.statusId
      ? await this.getStatusCodeById(updatedVersion.statusId)
      : null;
    const versionCode = updatedVersion.code;

    // Version approved
    if (newStatusCode === 'approved') {
      // Slack notification (convert ID to string for display)
      const changedByString = changedBy ? String(changedBy) : 'System';
      await this.slackService.notifyVersionApproved(
        versionCode,
        changedByString,
        updatedVersion.entityCode || 'Unknown Project',
      );

      // In-app notification to creator
      if (previousVersion.createdBy && changedBy && previousVersion.createdBy !== changedBy) {
        await this.notificationsService.notifyVersionApproved(
          previousVersion.createdBy,
          updatedVersion.code,
          versionCode,
          changedBy,
        );
      }
    }

    // Version rejected
    if (newStatusCode === 'rejected') {
      const reason = updatedVersion.description || 'No reason provided';

      // Slack notification (convert ID to string for display)
      const changedByString = changedBy ? String(changedBy) : 'System';
      await this.slackService.notifyVersionRejected(versionCode, changedByString, reason);

      // In-app notification to creator
      if (previousVersion.createdBy && changedBy && previousVersion.createdBy !== changedBy) {
        await this.notificationsService.notifyVersionRejected(
          previousVersion.createdBy,
          updatedVersion.code,
          versionCode,
          changedBy,
          reason,
        );
      }
    }
  }

  /**
   * Helper to extract bucket and path from MinIO URL
   */
  private extractBucketAndPath(url: string): {
    bucket: 'thumbnails' | 'media';
    path: string;
  } | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      if (pathParts.length < 2) return null;

      const bucket = pathParts[0] as 'thumbnails' | 'media';
      const path = pathParts.slice(1).join('/');

      return { bucket, path };
    } catch {
      return null;
    }
  }

  async remove(id: number, userContext?: UserContext): Promise<void> {
    // First get the version to be deleted
    const versionToDelete = await this.versionsRepository.findOne({
      where: { id },
      relations: ['status'],
    });

    if (!versionToDelete) {
      throw new NotFoundException(`Version with ID ${id} not found`);
    }

    // Verify user has contributor access
    if (userContext && versionToDelete.entityId && versionToDelete.entityType) {
      await this.projectAccessService.verifyVersionAccess(
        { entityId: versionToDelete.entityId, entityType: versionToDelete.entityType },
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }
    const wasLatest = versionToDelete.latest;

    // Delete associated files from storage before deleting the version
    if (versionToDelete.thumbnailPath) {
      try {
        const fileInfo = this.minioService.extractBucketAndPath(versionToDelete.thumbnailPath);
        if (fileInfo) {
          await this.minioService.deleteFile(fileInfo.bucket, fileInfo.path);
        }
      } catch (error) {
        console.warn(
          `Failed to delete thumbnail for version ${id}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (versionToDelete.filePath) {
      try {
        const fileInfo = this.minioService.extractBucketAndPath(versionToDelete.filePath);
        if (fileInfo) {
          await this.minioService.deleteFile(fileInfo.bucket, fileInfo.path);
        }
      } catch (error) {
        console.warn(
          `Failed to delete file for version ${id}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // Delete the version from database
    const result = await this.versionsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Version with ID ${id} not found`);
    }

    // If the deleted version was latest, assign latest to the most recent version
    if (wasLatest) {
      let mostRecentVersion: Version | null = null;
      if (versionToDelete.entityId !== undefined && versionToDelete.entityId !== null) {
        mostRecentVersion = await this.versionsRepository.findOne({
          where: {
            entityId: versionToDelete.entityId,
            entityType: versionToDelete.entityType,
          },
          order: { createdAt: 'DESC' },
        });
      } else if (versionToDelete.entityCode) {
        mostRecentVersion = await this.versionsRepository.findOne({
          where: {
            entityCode: versionToDelete.entityCode,
            entityType: versionToDelete.entityType,
          },
          order: { createdAt: 'DESC' },
        });
      }

      if (mostRecentVersion) {
        await this.versionsRepository.update(
          { id: mostRecentVersion.id },
          {
            latest: true,
          },
        );
      }
    }
  }

  async uploadThumbnail(id: number, file: File, userContext?: UserContext): Promise<Version> {
    // Check if version exists
    const version = await this.findOneById(id, userContext);

    // Delete old thumbnail if exists
    if (version.thumbnailPath) {
      try {
        // Extract bucket and path for deletion
        const thumbnailInfo = this.minioService.extractBucketAndPath(
          version.thumbnailPath,
          'thumbnails',
        );
        if (thumbnailInfo) {
          await this.minioService.deleteFile(thumbnailInfo.bucket, thumbnailInfo.path);
        }
      } catch (error) {
        // Log error but don't fail the upload
        console.warn('Failed to delete old thumbnail:', error);
      }
    }

    // Upload new thumbnail
    const uploadResult = await this.minioService.uploadFile(
      'thumbnails',
      file,
      undefined,
      this.minioService.getValidationOptions('thumbnail'),
    );

    // Store only the path (not the URL) - URL will be generated on-demand
    await this.versionsRepository.update(id, {
      thumbnailPath: uploadResult.path,
    });

    // Return updated version
    return this.findOneById(id, userContext);
  }

  async uploadFile(id: number, file: File, userContext?: UserContext): Promise<Version> {
    // Check if version exists
    const version = await this.findOneById(id, userContext);

    // Delete old file if exists
    if (version.filePath) {
      try {
        // Extract bucket and path for deletion
        const fileInfo = this.minioService.extractBucketAndPath(version.filePath, 'media');
        if (fileInfo) {
          await this.minioService.deleteFile(fileInfo.bucket, fileInfo.path);
        }
      } catch (error) {
        // Log error but don't fail the upload
        console.warn('Failed to delete old file:', error);
      }
    }

    // Delete old thumbnail if exists
    if (version.thumbnailPath) {
      try {
        const thumbnailInfo = this.minioService.extractBucketAndPath(
          version.thumbnailPath,
          'thumbnails',
        );
        if (thumbnailInfo) {
          await this.minioService.deleteFile(thumbnailInfo.bucket, thumbnailInfo.path);
        }
      } catch (error) {
        // Log error but don't fail the upload
        console.warn('Failed to delete old thumbnail:', error);
      }
    }

    // Upload new file
    const uploadResult = await this.minioService.uploadFile(
      'media',
      file,
      undefined,
      this.minioService.getValidationOptions('media'),
    );

    // Check if file is an image and generate thumbnail automatically
    const isImage = file.mimetype?.startsWith('image/') && file.mimetype !== 'image/x-exr';
    let thumbnailPath: string | undefined;

    if (isImage && file.buffer) {
      try {
        // Create temporary directory for processing
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-thumb-'));
        const tempThumbnailPath = path.join(tempDir, `thumbnail-${Date.now()}.webp`);

        // Generate thumbnail directly from buffer using sharp
        await sharp(file.buffer)
          .resize(320, 180, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 75 })
          .toFile(tempThumbnailPath);

        // Read thumbnail file
        const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);

        // Create a File-like object for thumbnail upload
        const thumbnailFile: File = {
          fieldname: 'thumbnail',
          originalname: `thumbnail-${path.parse(file.originalname).name}.webp`,
          encoding: '7bit',
          mimetype: 'image/webp',
          size: thumbnailBuffer.length,
          buffer: thumbnailBuffer,
          destination: '',
          filename: path.basename(tempThumbnailPath),
          path: tempThumbnailPath,
        } as File;

        // Upload thumbnail to MinIO
        const thumbnailUploadResult = await this.minioService.uploadFile(
          'thumbnails',
          thumbnailFile,
          undefined,
          this.minioService.getValidationOptions('thumbnail'),
        );

        thumbnailPath = thumbnailUploadResult.path;

        // Clean up temporary files
        try {
          fs.unlinkSync(tempThumbnailPath);
          fs.rmdirSync(tempDir);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary files:', cleanupError);
        }
      } catch (thumbnailError) {
        // Log error but don't fail the upload - file upload should succeed even if thumbnail generation fails
        console.warn('Failed to generate automatic thumbnail:', thumbnailError);
      }
    }

    // Store only the path (not the URL) - URL will be generated on-demand
    await this.versionsRepository.update(id, {
      filePath: uploadResult.path,
      ...(thumbnailPath && { thumbnailPath }),
    });

    // Return updated version
    return this.findOneById(id, userContext);
  }

  // Hybrid creation methods

  async createAssetWithVersion(dto: CreateAssetWithVersionDto, userContext?: UserContext) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Find project (by ID if provided, otherwise by code)
      const projectRepository = this.assetRepository.manager.getRepository('Project');
      interface Project {
        id: number;
      }
      let project: Project | null = null;
      if (dto.projectId !== undefined) {
        project = (await projectRepository.findOne({
          where: { id: dto.projectId },
        })) as Project | null;
        if (!project) {
          throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
        }
      } else {
        throw new BadRequestException('projectId is required');
      }

      // 2. Generate asset code if not provided
      let assetCode = dto.code;
      if (!assetCode) {
        const existingAssetsCount = await manager.count('Asset', {
          where: { projectId: project.id },
        });
        const assetNumber = String(existingAssetsCount + 1).padStart(3, '0');
        assetCode = `${dto.assetType.toUpperCase()}${assetNumber}`;
      }

      // 3. Get statusId for asset
      const assetStatusId = dto.statusId || null;

      // 3. Create asset directly
      const asset = manager.create(Asset, {
        name: dto.name,
        assetType: dto.assetType,
        projectId: project.id,
        code: assetCode,
        description: dto.description,
        statusId: assetStatusId,
        thumbnailPath: dto.thumbnailPath,
        createdBy: userContext?.userId || null,
        assignedTo: dto.assignedTo,
      });
      const savedAsset = await manager.save(asset);

      // 4. Create custom version
      const version = manager.create(Version, {
        code: dto.versionCode || `${savedAsset.code}_001`,
        name: dto.versionName || `Initial version of ${savedAsset.name}`,
        description: dto.versionDescription || 'Initial version created automatically',
        versionNumber: 1,
        statusId: dto.versionStatusId || (await this.getStatusIdByCode('wip')),
        latest: dto.latest !== false,
        entityId: savedAsset.id,
        entityCode: savedAsset.code,
        entityType: VersionEntityType.ASSET,
        filePath: dto.filePath,
        format: dto.format,
        frameRange: dto.frameRange,
        artist: dto.artist,
        createdBy: userContext?.userId || null,
        assignedTo: dto.versionAssignedTo ? Number(dto.versionAssignedTo) : dto.assignedTo,
        thumbnailPath: dto.versionThumbnailPath,
        publishedAt: dto.publishedAt,
        lineage: dto.lineage,
      });
      const savedVersion = await manager.save(version);

      return {
        asset: {
          ...savedAsset,
          versionCode: savedVersion.code,
        },
        version: savedVersion,
      };
    });
  }

  async createPlaylistWithVersion(dto: CreatePlaylistWithVersionDto, userContext?: UserContext) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Find project (by ID if provided, otherwise by code)
      const projectRepository = this.playlistRepository.manager.getRepository('Project');
      interface Project {
        id: number;
      }
      let project: Project | null = null;
      if (dto.projectId !== undefined) {
        project = (await projectRepository.findOne({
          where: { id: dto.projectId },
        })) as Project | null;
        if (!project) {
          throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
        }
      } else {
        throw new BadRequestException('projectId is required');
      }

      // 2. Generate playlist code if not provided
      let playlistCode = dto.code;
      if (!playlistCode) {
        const existingPlaylistsCount = await manager.count('Playlist', {
          where: { projectId: project.id },
        });
        const playlistNumber = String(existingPlaylistsCount + 1).padStart(3, '0');
        playlistCode = `PL${playlistNumber}`;
      }

      // 3. Get statusId for playlist
      const playlistStatusId = dto.statusId || null;

      // 3. Create playlist directly
      const playlist = manager.create(Playlist, {
        name: dto.name,
        projectId: project.id,
        code: playlistCode,
        description: dto.description,
        statusId: playlistStatusId,
        versionCodes: [],
        createdBy: userContext?.userId || null,
        assignedTo: dto.assignedTo,
      });
      const savedPlaylist = await manager.save(playlist);

      // 4. Create custom version
      const version = manager.create(Version, {
        code: dto.versionCode || `${savedPlaylist.code}_001`,
        name: dto.versionName || `Initial version of ${savedPlaylist.name}`,
        description: dto.versionDescription || 'Initial version created automatically',
        versionNumber: 1,
        statusId: dto.versionStatusId || (await this.getStatusIdByCode('wip')),
        latest: dto.latest !== false,
        entityId: savedPlaylist.id,
        entityCode: savedPlaylist.code,
        entityType: VersionEntityType.PLAYLIST,
        filePath: dto.filePath,
        format: dto.format,
        frameRange: dto.frameRange,
        artist: dto.artist,
        createdBy: userContext?.userId || null,
        assignedTo: dto.versionAssignedTo ? Number(dto.versionAssignedTo) : dto.assignedTo,
        thumbnailPath: dto.versionThumbnailPath,
        publishedAt: dto.publishedAt,
        lineage: dto.lineage,
      });
      const savedVersion = await manager.save(version);

      return {
        playlist: {
          ...savedPlaylist,
          versionCode: savedVersion.code,
        },
        version: savedVersion,
      };
    });
  }

  async createSequenceWithVersion(dto: CreateSequenceWithVersionDto, userContext?: UserContext) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Find episode (by ID if provided, otherwise by code)
      const episodeRepository = this.sequenceRepository.manager.getRepository('Episode');
      interface Episode {
        id: number;
      }
      let episode: Episode | null = null;
      if (dto.episodeId !== undefined) {
        episode = (await episodeRepository.findOne({
          where: { id: dto.episodeId },
        })) as Episode | null;
        if (!episode) {
          throw new NotFoundException(`Episode with ID ${dto.episodeId} not found`);
        }
      } else {
        throw new BadRequestException('episodeId is required');
      }

      // 2. Generate sequence code if not provided
      let sequenceCode = dto.code;
      if (!sequenceCode) {
        const existingSequencesCount = await manager.count('Sequence', {
          where: { episodeId: episode.id },
        });
        const sequenceNumber = String(existingSequencesCount + 1).padStart(3, '0');
        sequenceCode = `SEQ${sequenceNumber}`;
      }

      // 3. Get statusId for sequence
      const sequenceStatusId = dto.statusId || null;

      // 3. Create sequence directly
      const sequence = manager.create(Sequence, {
        name: dto.name,
        cutOrder: dto.cutOrder || 1,
        episodeId: episode.id,
        code: sequenceCode,
        description: dto.description,
        statusId: sequenceStatusId,
        duration: dto.duration,
        storyId: dto.storyId,
        createdBy: userContext?.userId ?? null,
        assignedTo: dto.assignedTo,
      });
      const savedSequence = await manager.save(sequence);

      // 4. Create custom version
      const version = manager.create(Version, {
        code: dto.versionCode || `${savedSequence.code}_001`,
        name: dto.versionName || `Initial version of ${savedSequence.name}`,
        description: dto.versionDescription || 'Initial version created automatically',
        versionNumber: 1,
        statusId: dto.versionStatusId || (await this.getStatusIdByCode('wip')),
        latest: dto.latest !== false,
        entityId: savedSequence.id,
        entityCode: savedSequence.code,
        entityType: VersionEntityType.SEQUENCE,
        filePath: dto.filePath,
        format: dto.format,
        frameRange: dto.frameRange,
        artist: dto.artist,
        createdBy: userContext?.userId || null,
        assignedTo: dto.versionAssignedTo ? Number(dto.versionAssignedTo) : dto.assignedTo,
        thumbnailPath: dto.versionThumbnailPath,
        publishedAt: dto.publishedAt,
        lineage: dto.lineage,
      });
      const savedVersion = await manager.save(version);

      return {
        sequence: {
          ...savedSequence,
          versionCode: savedVersion.code,
        },
        version: savedVersion,
      };
    });
  }
}
