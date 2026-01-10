import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset, Project, Version, Status, ProjectRole } from '../entities';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FilterAssetsDto } from './dto/filter-assets.dto';
import { MinioService } from '../files/minio.service';
import { UserContext, ProjectAccessService } from '../auth/services';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Version)
    private versionRepository: Repository<Version>,
    @InjectRepository(Status)
    private statusRepository: Repository<Status>,
    private minioService: MinioService,
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
   * Transform asset to regenerate file URLs to ensure they don't expire
   */
  private async transformAsset(asset: Asset): Promise<Asset> {
    if (asset.thumbnailPath) {
      try {
        // Extract bucket and path, defaulting to 'thumbnails' bucket for thumbnailPath
        const fileInfo = this.minioService.extractBucketAndPath(asset.thumbnailPath, 'thumbnails');
        if (fileInfo) {
          asset.thumbnailPath = await this.minioService.getFileUrl(fileInfo.bucket, fileInfo.path);
        }
      } catch (error) {
        // Log error but don't fail - keep original path/URL
        console.warn(`Failed to regenerate thumbnailPath URL for asset ${asset.id}:`, error);
      }
    }
    return asset;
  }

  async create(createAssetDto: CreateAssetDto, userContext?: UserContext): Promise<Asset> {
    // Check for duplicate code
    const existingAsset = await this.assetRepository.findOne({
      where: { code: createAssetDto.code },
    });

    if (existingAsset) {
      throw new ConflictException(`Asset with code '${createAssetDto.code}' already exists`);
    }

    let project: Project | null = null;

    if (createAssetDto.projectId) {
      project = await this.projectRepository.findOne({
        where: { id: createAssetDto.projectId },
      });
      if (!project) {
        throw new NotFoundException(`Project with ID ${createAssetDto.projectId} not found`);
      }
    } else if (createAssetDto.projectCode) {
      // Backward compatibility: resolve project by code
      project = await this.projectRepository.findOne({
        where: { code: createAssetDto.projectCode },
      });
      if (!project) {
        throw new NotFoundException(`Project with code ${createAssetDto.projectCode} not found`);
      }
    }

    if (!project) {
      throw new NotFoundException('Project reference is required (projectId or projectCode)');
    }

    // Verify user has contributor access to the project
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        project.id,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    const statusId = createAssetDto.statusId || null;

    const asset = this.assetRepository.create({
      code: createAssetDto.code,
      name: createAssetDto.name,
      assetType: createAssetDto.assetType,
      statusId: statusId,
      description: createAssetDto.description,
      thumbnailPath: createAssetDto.thumbnailPath,
      createdBy: userContext?.userId || null,
      assignedTo: createAssetDto.assignedTo,
      projectId: project.id,
    });
    const savedAsset = await this.assetRepository.save(asset);

    return savedAsset;
  }

  async findAll(filters?: FilterAssetsDto, userContext?: UserContext): Promise<Asset[]> {
    const queryBuilder = this.assetRepository
      .createQueryBuilder('asset')
      .orderBy('asset.assetType', 'ASC')
      .addOrderBy('asset.name', 'ASC')
      .addOrderBy('asset.createdAt', 'DESC');

    // Filter by user's accessible projects (unless admin)
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds =
        await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return [];
      }
      queryBuilder.andWhere('asset.projectId IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    if (filters?.status) {
      const statusId = await this.getStatusIdByCode(filters.status);
      if (statusId) {
        queryBuilder.andWhere('asset.statusId = :statusId', {
          statusId: statusId,
        });
      }
    }

    if (filters?.assetType) {
      queryBuilder.andWhere('asset.assetType = :assetType', {
        assetType: filters.assetType,
      });
    }

    if (filters?.projectId) {
      // If userContext is provided, verify access to the requested project
      if (userContext) {
        await this.projectAccessService.verifyProjectAccess(
          filters.projectId,
          userContext,
          ProjectRole.VIEWER,
        );
      }
      queryBuilder.andWhere('asset.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters?.createdBy) {
      queryBuilder.andWhere('asset.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    if (filters?.assignedTo) {
      queryBuilder.andWhere('asset.assignedTo = :assignedTo', {
        assignedTo: filters.assignedTo,
      });
    }

    // projectId is now directly available on each asset entity
    const assets = await queryBuilder.getMany();

    // Regenerate URLs for all assets
    const transformedAssets = [];
    for (const asset of assets) {
      transformedAssets.push(await this.transformAsset(asset));
    }
    return transformedAssets;
  }

  async findOneById(id: number, userContext?: UserContext): Promise<Asset> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid asset ID');
    }

    const asset = await this.assetRepository.findOne({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    // Verify user has access to the asset's project
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        asset.projectId,
        userContext,
        ProjectRole.VIEWER,
      );
    }

    return await this.transformAsset(asset);
  }

  async findOne(code: string, userContext?: UserContext): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { code },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with code ${code} not found`);
    }

    // Verify user has access to the asset's project
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        asset.projectId,
        userContext,
        ProjectRole.VIEWER,
      );
    }

    return await this.transformAsset(asset);
  }

  async update(
    id: number,
    updateAssetDto: UpdateAssetDto,
    userContext?: UserContext,
  ): Promise<Asset> {
    const asset = await this.assetRepository.findOne({ where: { id } });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    // Verify user has contributor access
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        asset.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    const updateData: any = {};

    if (updateAssetDto.code !== undefined) {
      const existingCode = await this.assetRepository.findOne({
        where: { code: updateAssetDto.code },
      });
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(`Asset with code '${updateAssetDto.code}' already exists`);
      }
      updateData.code = updateAssetDto.code;
    }
    if (updateAssetDto.name !== undefined) updateData.name = updateAssetDto.name;
    if (updateAssetDto.assetType !== undefined) updateData.assetType = updateAssetDto.assetType;
    if (updateAssetDto.statusId) {
      updateData.statusId = updateAssetDto.statusId;
    }
    if (updateAssetDto.description !== undefined)
      updateData.description = updateAssetDto.description;
    if (updateAssetDto.thumbnailPath !== undefined)
      updateData.thumbnailPath = updateAssetDto.thumbnailPath;
    // createdBy should not be updated - it's set automatically on creation
    if (updateAssetDto.assignedTo !== undefined) updateData.assignedTo = updateAssetDto.assignedTo;

    // Handle project relation update
    if (updateAssetDto.projectId !== undefined && updateAssetDto.projectId !== asset.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: updateAssetDto.projectId },
      });
      if (!project) {
        throw new NotFoundException(`Project with ID ${updateAssetDto.projectId} not found`);
      }
      // Verify access to new project
      if (userContext) {
        await this.projectAccessService.verifyProjectAccess(
          updateAssetDto.projectId,
          userContext,
          ProjectRole.CONTRIBUTOR,
        );
      }
      updateData.projectId = updateAssetDto.projectId;
    }

    await this.assetRepository.update(id, updateData);
    const updatedAsset = await this.assetRepository.findOne({ where: { id } });
    if (!updatedAsset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return await this.transformAsset(updatedAsset);
  }

  async remove(id: number, userContext?: UserContext): Promise<void> {
    const asset = await this.assetRepository.findOne({ where: { id } });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        asset.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    await this.assetRepository.delete(id);
  }

  async uploadThumbnail(id: number, file: any, userContext?: UserContext): Promise<Asset> {
    // Check if asset exists
    const asset = await this.findOneById(id, userContext);

    // Delete old thumbnail if exists
    if (asset.thumbnailPath) {
      try {
        // Extract bucket and path for deletion
        const thumbnailInfo = this.minioService.extractBucketAndPath(
          asset.thumbnailPath,
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
    await this.assetRepository.update(id, {
      thumbnailPath: uploadResult.path,
    });

    // Return updated asset with regenerated URL
    const updatedAsset = await this.assetRepository.findOne({ where: { id } });
    if (!updatedAsset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return await this.transformAsset(updatedAsset);
  }

  async uploadThumbnailByCode(code: string, file: any, userContext?: UserContext): Promise<Asset> {
    // Check if asset exists
    const asset = await this.findOne(code, userContext);

    // Delete old thumbnail if exists
    if (asset.thumbnailPath) {
      try {
        // Extract bucket and path for deletion
        const thumbnailInfo = this.minioService.extractBucketAndPath(
          asset.thumbnailPath,
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
    await this.assetRepository.update({ code }, { thumbnailPath: uploadResult.path });

    // Return updated asset with regenerated URL
    const updatedAsset = await this.assetRepository.findOne({ where: { code } });
    if (!updatedAsset) {
      throw new NotFoundException(`Asset with code ${code} not found`);
    }
    return await this.transformAsset(updatedAsset);
  }
}
