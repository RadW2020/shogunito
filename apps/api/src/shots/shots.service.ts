import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shot, Sequence, Version, Note, Status, ProjectRole } from '../entities';
import { CreateShotDto } from './dto/create-shot.dto';
import { UpdateShotDto } from './dto/update-shot.dto';
import { FilterShotsDto } from './dto/filter-shots.dto';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';

type ShotWithNotes = Omit<Shot, 'notes'> & { notes: Note[] };

@Injectable()
export class ShotsService {
  constructor(
    @InjectRepository(Shot)
    private shotRepository: Repository<Shot>,
    @InjectRepository(Sequence)
    private sequenceRepository: Repository<Sequence>,
    @InjectRepository(Version)
    private versionRepository: Repository<Version>,
    @InjectRepository(Status)
    private statusRepository: Repository<Status>,
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
   * Transform shot to include status code for frontend compatibility
   */
  private async transformShot(shot: any): Promise<any> {
    // Use the loaded status relation if available, otherwise fetch it
    const statusCode = shot.status?.code
      ? shot.status.code
      : shot.statusId
        ? await this.getStatusCodeById(shot.statusId)
        : null;
    return {
      ...shot,
      status: statusCode || null,
    };
  }

  private async loadNotesForEntity(linkId: string, linkType: string): Promise<Note[]> {
    return this.shotRepository.manager
      .createQueryBuilder(Note, 'note')
      .where('note.linkId = :linkId AND note.linkType = :linkType', {
        linkId,
        linkType,
      })
      .getMany();
  }

  async create(createShotDto: CreateShotDto, userContext?: UserContext): Promise<Shot> {
    // Get the sequence reference - sequenceId is required
    if (!createShotDto.sequenceId) {
      throw new BadRequestException('Sequence reference is required (sequenceId)');
    }

    const sequence = await this.sequenceRepository.findOne({
      where: { id: createShotDto.sequenceId },
      relations: ['episode'],
    });
    if (!sequence) {
      throw new NotFoundException(`Sequence with ID ${createShotDto.sequenceId} not found`);
    }

    // Verify user has contributor access to the project (via sequence -> episode)
    if (userContext && sequence.episode) {
      await this.projectAccessService.verifyProjectAccess(
        sequence.episode.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    // Check for duplicate code if provided
    if (createShotDto.code) {
      const existingShot = await this.shotRepository.findOne({
        where: { code: createShotDto.code },
      });
      if (existingShot) {
        throw new ConflictException(`Shot with code '${createShotDto.code}' already exists`);
      }
    }

    // Get existing shots count for this sequence to generate next number
    const existingShotsCount = await this.shotRepository.count({
      where: { sequenceId: sequence.id },
    });

    // Generate shot code based on sequence code and shot number if not provided
    const shotNumber = String(existingShotsCount + 1).padStart(3, '0');
    const shotCode = createShotDto.code || `SH${shotNumber}`;

    // Get statusId for shot
    const shotStatusId = createShotDto.statusId || null;

    const shot = this.shotRepository.create({
      code: shotCode,
      name: createShotDto.name,
      description: createShotDto.description,
      sequenceNumber: createShotDto.sequenceNumber,
      statusId: shotStatusId,
      shotType: createShotDto.shotType,
      duration: createShotDto.duration,
      cutOrder: createShotDto.cutOrder,
      createdBy: userContext?.userId || null,
      assignedTo: createShotDto.assignedTo,
      sequenceId: sequence.id,
    });
    const savedShot = await this.shotRepository.save(shot);

    // Reload with relations to ensure sequence and status are included
    const reloadedShot = await this.shotRepository.findOne({
      where: { id: savedShot.id },
      relations: ['sequence', 'status'],
    });

    const result = reloadedShot || savedShot;
    // Transform shot to include status code
    return await this.transformShot(result);
  }

  async findAll(filters?: FilterShotsDto, userContext?: UserContext): Promise<Shot[]> {
    const queryBuilder = this.shotRepository
      .createQueryBuilder('shot')
      .leftJoinAndSelect('shot.sequence', 'sequence')
      .leftJoin('sequence.episode', 'episode')
      .leftJoinAndSelect('shot.status', 'status')
      .orderBy('shot.sequenceNumber', 'ASC', 'NULLS LAST')
      .addOrderBy('shot.cutOrder', 'ASC', 'NULLS LAST')
      .addOrderBy('shot.createdAt', 'DESC');

    // Filter by user's accessible projects (unless admin)
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds = await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return [];
      }
      queryBuilder.andWhere('episode.projectId IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    if (filters?.status) {
      const statusId = await this.getStatusIdByCode(filters.status);
      if (statusId) {
        queryBuilder.andWhere('shot.statusId = :statusId', {
          statusId: statusId,
        });
      }
    }

    if (filters?.shotType) {
      queryBuilder.andWhere('shot.shotType = :shotType', {
        shotType: filters.shotType,
      });
    }

    let sequenceFilterId: number | undefined = filters?.sequenceId as unknown as number;
    if (filters?.sequenceCode) {
      const sequence = await this.sequenceRepository.findOne({
        where: { code: filters.sequenceCode },
      });
      if (!sequence) {
        return [];
      }
      sequenceFilterId = sequence.id;
    }

    if (sequenceFilterId) {
      queryBuilder.andWhere('shot.sequenceId = :sequenceId', {
        sequenceId: sequenceFilterId,
      });
    }

    if (filters?.cutOrder !== undefined) {
      queryBuilder.andWhere('shot.cutOrder = :cutOrder', {
        cutOrder: filters.cutOrder,
      });
    }

    if (filters?.sequenceNumber !== undefined) {
      queryBuilder.andWhere('shot.sequenceNumber = :sequenceNumber', {
        sequenceNumber: filters.sequenceNumber,
      });
    }

    if (filters?.createdBy) {
      queryBuilder.andWhere('shot.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    if (filters?.assignedTo) {
      queryBuilder.andWhere('shot.assignedTo = :assignedTo', {
        assignedTo: filters.assignedTo,
      });
    }

    const shots = await queryBuilder.getMany();

    // Load notes for all shots and transform to include status code
    const transformedShots = [];
    for (const shot of shots) {
      (shot as unknown as ShotWithNotes).notes = await this.loadNotesForEntity(
        shot.id.toString(),
        'Shot',
      );
      // Transform shot to include status code
      transformedShots.push(await this.transformShot(shot));
    }

    return transformedShots;
  }

  async findOneById(id: number, userContext?: UserContext): Promise<Shot> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid shot ID');
    }

    const shot = await this.shotRepository.findOne({
      where: { id },
      relations: ['sequence', 'status'],
    });

    if (!shot) {
      throw new NotFoundException(`Shot with ID ${id} not found`);
    }

    // Verify user has access to the shot's project
    if (userContext) {
      await this.projectAccessService.verifyShotAccess(
        shot.id,
        userContext,
        ProjectRole.VIEWER,
      );
    }

    // Load notes for this shot
    (shot as unknown as ShotWithNotes).notes = await this.loadNotesForEntity(
      shot.id.toString(),
      'Shot',
    );

    // Transform shot to include status code
    return await this.transformShot(shot);
  }

  async findOne(code: string): Promise<any> {
    const shot = await this.shotRepository.findOne({
      where: { code },
      relations: ['sequence', 'status'],
    });

    if (!shot) {
      throw new NotFoundException(`Shot with code ${code} not found`);
    }

    // Load notes for this shot
    (shot as unknown as ShotWithNotes).notes = await this.loadNotesForEntity(
      shot.id.toString(),
      'Shot',
    );

    // Transform shot to include status code
    return await this.transformShot(shot);
  }

  async update(id: number, updateShotDto: UpdateShotDto, userContext?: UserContext): Promise<Shot> {
    const shot = await this.shotRepository.findOne({
      where: { id },
      relations: ['sequence', 'sequence.episode'],
    });

    if (!shot) {
      throw new NotFoundException(`Shot with ID ${id} not found`);
    }

    // Verify user has contributor access
    if (userContext && shot.sequence?.episode) {
      await this.projectAccessService.verifyProjectAccess(
        shot.sequence.episode.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    const updateData: any = {};

    if (updateShotDto.code !== undefined) {
      const existingCode = await this.shotRepository.findOne({
        where: { code: updateShotDto.code },
      });
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(`Shot with code '${updateShotDto.code}' already exists`);
      }
      updateData.code = updateShotDto.code;
    }
    if (updateShotDto.name !== undefined) updateData.name = updateShotDto.name;
    if (updateShotDto.description !== undefined) updateData.description = updateShotDto.description;
    if (updateShotDto.sequenceNumber !== undefined)
      updateData.sequenceNumber = updateShotDto.sequenceNumber;
    if (updateShotDto.statusId !== undefined) {
      updateData.statusId = updateShotDto.statusId;
    }
    if (updateShotDto.shotType !== undefined) updateData.shotType = updateShotDto.shotType;
    if (updateShotDto.duration !== undefined) updateData.duration = updateShotDto.duration;
    if (updateShotDto.cutOrder !== undefined) updateData.cutOrder = updateShotDto.cutOrder;
    // createdBy should not be updated - it's set automatically on creation
    if (updateShotDto.assignedTo !== undefined) updateData.assignedTo = updateShotDto.assignedTo;

    // Handle sequence relation update
    if (updateShotDto.sequenceId) {
      const sequence = await this.sequenceRepository.findOne({
        where: { id: updateShotDto.sequenceId },
        relations: ['episode'],
      });
      if (!sequence) {
        throw new NotFoundException(`Sequence with ID ${updateShotDto.sequenceId} not found`);
      }
      // Verify access to new sequence's project
      if (userContext && sequence.episode) {
        await this.projectAccessService.verifyProjectAccess(
          sequence.episode.projectId,
          userContext,
          ProjectRole.CONTRIBUTOR,
        );
      }
      updateData.sequenceId = sequence.id;
    } else if (updateShotDto.sequenceCode) {
      // Backward compatibility: resolve sequence by code
      const sequence = await this.sequenceRepository.findOne({
        where: { code: updateShotDto.sequenceCode },
        relations: ['episode'],
      });
      if (!sequence) {
        throw new NotFoundException(`Sequence with code ${updateShotDto.sequenceCode} not found`);
      }
      // Verify access to new sequence's project
      if (userContext && sequence.episode) {
        await this.projectAccessService.verifyProjectAccess(
          sequence.episode.projectId,
          userContext,
          ProjectRole.CONTRIBUTOR,
        );
      }
      updateData.sequenceId = sequence.id;
    }

    await this.shotRepository.update(id, updateData);
    return await this.findOneById(id, userContext);
  }

  async remove(id: number, userContext?: UserContext): Promise<void> {
    const shot = await this.shotRepository.findOne({
      where: { id },
      relations: ['sequence', 'sequence.episode'],
    });

    if (!shot) {
      throw new NotFoundException(`Shot with ID ${id} not found`);
    }

    if (userContext && shot.sequence?.episode) {
      await this.projectAccessService.verifyProjectAccess(
        shot.sequence.episode.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    await this.shotRepository.delete(id);
  }
}
