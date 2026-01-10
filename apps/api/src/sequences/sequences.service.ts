import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { FilterSequencesDto } from './dto/filter-sequences.dto';
import { Sequence, Episode, Version, Status, ProjectRole } from '../entities';
import { EpisodesService } from '../episodes/episodes.service';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';

@Injectable()
export class SequencesService {
  constructor(
    @InjectRepository(Sequence)
    private sequenceRepository: Repository<Sequence>,
    @InjectRepository(Episode)
    private episodeRepository: Repository<Episode>,
    @InjectRepository(Version)
    private versionRepository: Repository<Version>,
    @InjectRepository(Status)
    private statusRepository: Repository<Status>,
    @Inject(forwardRef(() => EpisodesService))
    private episodesService: EpisodesService,
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
   * Transform sequence to include status code for frontend compatibility
   */
  private async transformSequence(sequence: any): Promise<any> {
    // Use the loaded status relation if available, otherwise fetch it
    const statusCode = sequence.status?.code
      ? sequence.status.code
      : sequence.statusId
        ? await this.getStatusCodeById(sequence.statusId)
        : null;
    return {
      ...sequence,
      status: statusCode || null,
    };
  }

  private async loadNotesForEntity(linkId: string, linkType: string) {
    return this.sequenceRepository.manager
      .createQueryBuilder()
      .select('note')
      .from('Note', 'note')
      .where('note.linkId = :linkId AND note.linkType = :linkType', {
        linkId,
        linkType,
      })
      .getMany();
  }

  async create(createSequenceDto: CreateSequenceDto, userContext?: UserContext): Promise<Sequence> {
    // Get the episode reference
    const episode = await this.episodeRepository.findOne({
      where: { id: createSequenceDto.episodeId },
    });

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${createSequenceDto.episodeId} not found`);
    }

    // Verify user has contributor access to the project
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        episode.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    // Check for duplicate code
    const existingSequence = await this.sequenceRepository.findOne({
      where: { code: createSequenceDto.code },
    });

    if (existingSequence) {
      throw new ConflictException(`Sequence with code '${createSequenceDto.code}' already exists`);
    }

    // Get status IDs
    const versionStatusId = await this.getStatusIdByCode('wip');
    const sequenceStatusId = createSequenceDto.statusId || null;

    // Create initial version for the sequence
    const initialVersion = this.versionRepository.create({
      code: `${createSequenceDto.code}_001`,
      name: `Initial version of ${createSequenceDto.name}`,
      description: 'Initial version created automatically',
      versionNumber: 1,
      statusId: versionStatusId,
      latest: true,
      createdBy: userContext?.userId || null,
    });
    await this.versionRepository.save(initialVersion);

    const sequence = this.sequenceRepository.create({
      code: createSequenceDto.code,
      name: createSequenceDto.name,
      description: createSequenceDto.description,
      cutOrder: createSequenceDto.cutOrder,
      statusId: sequenceStatusId,
      duration: createSequenceDto.duration,
      storyId: createSequenceDto.storyId,
      createdBy: userContext?.userId || null,
      assignedTo: createSequenceDto.assignedTo,
      episodeId: createSequenceDto.episodeId,
    });

    const savedSequence = await this.sequenceRepository.save(sequence);

    // Actualizar la duración del episodio
    await this.episodesService.updateEpisodeDuration(episode.id, userContext);

    // Transform sequence to include status code
    return await this.transformSequence(savedSequence);
  }

  async findAll(filters?: FilterSequencesDto, userContext?: UserContext): Promise<Sequence[]> {
    const queryBuilder = this.sequenceRepository
      .createQueryBuilder('sequence')
      .leftJoin(Episode, 'episode', 'episode.id = sequence.episodeId')
      .leftJoinAndSelect('sequence.status', 'status')
      .orderBy('sequence.cutOrder', 'ASC', 'NULLS LAST');

    // Filter by user's accessible projects (unless admin)
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds =
        await this.projectAccessService.getAccessibleProjectIds(userContext);
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
        queryBuilder.andWhere('sequence.statusId = :statusId', {
          statusId: statusId,
        });
      }
    }

    if (filters?.episodeId) {
      queryBuilder.andWhere('sequence.episodeId = :episodeId', {
        episodeId: filters.episodeId,
      });
    }

    if (filters?.projectId) {
      // Filter by projectId through episode (episode join already exists)
      queryBuilder.andWhere('episode.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters?.cutOrder !== undefined) {
      queryBuilder.andWhere('sequence.cutOrder = :cutOrder', {
        cutOrder: filters.cutOrder,
      });
    }

    if (filters?.createdBy) {
      queryBuilder.andWhere('sequence.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    if (filters?.assignedTo) {
      queryBuilder.andWhere('sequence.assignedTo = :assignedTo', {
        assignedTo: filters.assignedTo,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere('sequence.name ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    // Apply pagination if provided
    if (filters?.page && filters?.limit) {
      const skip = (filters.page - 1) * filters.limit;
      queryBuilder.skip(skip).take(filters.limit);
    }

    const sequences = await queryBuilder.getMany();

    // Load notes for all sequences, and transform to include status code
    const transformedSequences = [];
    for (const sequence of sequences) {
      (sequence as any).notes = await this.loadNotesForEntity(sequence.id.toString(), 'Sequence');

      // Transform sequence to include status code
      transformedSequences.push(await this.transformSequence(sequence));
    }

    return transformedSequences;
  }

  async findOneById(id: number, userContext?: UserContext): Promise<Sequence> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid sequence ID');
    }

    const sequence = await this.sequenceRepository.findOne({
      where: { id },
      relations: ['episode', 'status'],
    });

    if (!sequence) {
      throw new NotFoundException(`Sequence with ID ${id} not found`);
    }

    // Verify user has access via episode's project
    if (userContext && sequence.episode) {
      await this.projectAccessService.verifyProjectAccess(sequence.episode.projectId, userContext);
    }

    (sequence as any).notes = await this.loadNotesForEntity(sequence.id.toString(), 'Sequence');

    // Transform sequence to include status code
    return await this.transformSequence(sequence);
  }

  async findOne(code: string, userContext?: UserContext): Promise<Sequence> {
    const sequence = await this.sequenceRepository.findOne({
      where: { code },
      relations: ['episode', 'status'],
    });

    if (!sequence) {
      throw new NotFoundException(`Sequence with code ${code} not found`);
    }

    if (userContext && sequence.episode) {
      await this.projectAccessService.verifyProjectAccess(sequence.episode.projectId, userContext);
    }

    (sequence as any).notes = await this.loadNotesForEntity(sequence.id.toString(), 'Sequence');

    // Transform sequence to include status code
    return await this.transformSequence(sequence);
  }

  async update(
    id: number,
    updateSequenceDto: UpdateSequenceDto,
    userContext?: UserContext,
  ): Promise<Sequence> {
    const sequence = await this.sequenceRepository.findOne({
      where: { id },
      relations: ['episode'],
    });

    if (!sequence) {
      throw new NotFoundException(`Sequence with ID ${id} not found`);
    }

    const originalEpisodeId = sequence.episodeId;

    // Verify user has contributor access
    if (userContext && sequence.episode) {
      await this.projectAccessService.verifyProjectAccess(
        sequence.episode.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    const updateData: any = {};

    if (updateSequenceDto.code !== undefined) {
      const existingCode = await this.sequenceRepository.findOne({
        where: { code: updateSequenceDto.code },
      });
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(
          `Sequence with code '${updateSequenceDto.code}' already exists`,
        );
      }
      updateData.code = updateSequenceDto.code;
    }
    if (updateSequenceDto.name !== undefined) updateData.name = updateSequenceDto.name;
    if (updateSequenceDto.description !== undefined)
      updateData.description = updateSequenceDto.description;
    if (updateSequenceDto.cutOrder !== undefined) updateData.cutOrder = updateSequenceDto.cutOrder;
    if (updateSequenceDto.statusId !== undefined) {
      updateData.statusId = updateSequenceDto.statusId;
    }
    if (updateSequenceDto.duration !== undefined) updateData.duration = updateSequenceDto.duration;
    if (updateSequenceDto.storyId !== undefined) updateData.storyId = updateSequenceDto.storyId;
    // createdBy should not be updated - it's set automatically on creation
    if (updateSequenceDto.assignedTo !== undefined)
      updateData.assignedTo = updateSequenceDto.assignedTo;

    // Handle episode relation update
    if (updateSequenceDto.episodeId) {
      const newEpisode = await this.episodeRepository.findOne({
        where: { id: updateSequenceDto.episodeId },
      });
      if (!newEpisode) {
        throw new NotFoundException(`Episode with ID ${updateSequenceDto.episodeId} not found`);
      }
      // Verify access to new episode's project
      if (userContext) {
        await this.projectAccessService.verifyProjectAccess(
          newEpisode.projectId,
          userContext,
          ProjectRole.CONTRIBUTOR,
        );
      }
      updateData.episodeId = updateSequenceDto.episodeId;
    }

    await this.sequenceRepository.update(id, updateData);

    // Actualizar la duración del episodio original
    await this.episodesService.updateEpisodeDuration(originalEpisodeId, userContext);

    // Si cambió el episodio, actualizar también el nuevo episodio
    if (updateSequenceDto.episodeId && updateSequenceDto.episodeId !== originalEpisodeId) {
      await this.episodesService.updateEpisodeDuration(updateSequenceDto.episodeId, userContext);
    }

    return await this.findOneById(id, userContext);
  }

  async remove(id: number, userContext?: UserContext): Promise<void> {
    const sequence = await this.sequenceRepository.findOne({
      where: { id },
      relations: ['episode'],
    });

    if (!sequence) {
      throw new NotFoundException(`Sequence with ID ${id} not found`);
    }

    if (userContext && sequence.episode) {
      await this.projectAccessService.verifyProjectAccess(
        sequence.episode.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    const episodeId = sequence.episodeId;
    await this.sequenceRepository.delete(id);
    await this.episodesService.updateEpisodeDuration(episodeId, userContext);
  }
}
