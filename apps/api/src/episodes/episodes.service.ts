import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';
import { FilterEpisodesDto } from './dto/filter-episodes.dto';
import { Episode, Project, Sequence, Status, ProjectRole } from '../entities';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';

@Injectable()
export class EpisodesService {
  constructor(
    @InjectRepository(Episode)
    private episodeRepository: Repository<Episode>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Sequence)
    private sequenceRepository: Repository<Sequence>,
    @InjectRepository(Status)
    private statusRepository: Repository<Status>,
    private projectAccessService: ProjectAccessService,
  ) {}

  private async getStatusIdByCode(statusCode?: string): Promise<string | null> {
    if (!statusCode) return null;
    const status = await this.statusRepository.findOne({
      where: { code: statusCode },
    });
    return status?.id || null;
  }

  async create(createEpisodeDto: CreateEpisodeDto, userContext?: UserContext): Promise<Episode> {
    // Verify user has contributor access to the project
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        createEpisodeDto.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    const existingEpisode = await this.episodeRepository.findOne({
      where: { code: createEpisodeDto.code },
    });

    if (existingEpisode) {
      throw new ConflictException(`Episode with code '${createEpisodeDto.code}' already exists`);
    }

    const project = await this.projectRepository.findOne({
      where: { id: createEpisodeDto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${createEpisodeDto.projectId} not found`);
    }

    const episode = this.episodeRepository.create({
      code: createEpisodeDto.code,
      name: createEpisodeDto.name,
      description: createEpisodeDto.description,
      statusId: createEpisodeDto.statusId,
      duration: createEpisodeDto.duration,
      epNumber: createEpisodeDto.epNumber,
      cutOrder: createEpisodeDto.cutOrder,
      createdBy: userContext?.userId || null,
      assignedTo: createEpisodeDto.assignedTo,
      projectId: createEpisodeDto.projectId,
    });

    try {
      return await this.episodeRepository.save(episode);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(`Episode with code '${createEpisodeDto.code}' already exists`);
      }
      throw error;
    }
  }

  private async loadNotesForEntity(linkId: string, linkType: string) {
    return this.episodeRepository.manager
      .createQueryBuilder()
      .select('note')
      .from('Note', 'note')
      .where('note.linkId = :linkId AND note.linkType = :linkType', {
        linkId,
        linkType,
      })
      .getMany();
  }

  async findAll(filters?: FilterEpisodesDto, userContext?: UserContext): Promise<Episode[]> {
    const queryBuilder = this.episodeRepository
      .createQueryBuilder('episode')
      .leftJoinAndSelect('episode.sequences', 'sequences')
      .orderBy('episode.cutOrder', 'ASC', 'NULLS LAST')
      .addOrderBy('sequences.cutOrder', 'ASC', 'NULLS LAST');

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

    if (filters?.statusId) {
      queryBuilder.andWhere('episode.statusId = :statusId', {
        statusId: filters.statusId,
      });
    }

    if (filters?.projectId) {
      queryBuilder.andWhere('episode.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters?.createdBy) {
      queryBuilder.andWhere('episode.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    if (filters?.assignedTo) {
      queryBuilder.andWhere('episode.assignedTo = :assignedTo', {
        assignedTo: filters.assignedTo,
      });
    }

    const episodes = await queryBuilder.getMany();

    for (const episode of episodes) {
      (episode as any).notes = await this.loadNotesForEntity(episode.id.toString(), 'Episode');
      const sequences = episode.sequences || [];

      for (const sequence of sequences) {

        (sequence as any).notes = await this.loadNotesForEntity(sequence.id.toString(), 'Sequence');

      }
    }

    return episodes;
  }

  async findOneById(id: number, userContext?: UserContext): Promise<Episode> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid episode ID');
    }

    const episode = await this.episodeRepository.findOne({
      where: { id },
      relations: ['sequences'],
    });

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    // Verify user has access to this episode's project
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(episode.projectId, userContext);
    }

    (episode as any).notes = await this.loadNotesForEntity(episode.id.toString(), 'Episode');
    const sequences = episode.sequences;

    for (const sequence of sequences || []) {

      (sequence as any).notes = await this.loadNotesForEntity(sequence.id.toString(), 'Sequence');

    }

    return episode;
  }

  async findOne(code: string, userContext?: UserContext): Promise<Episode> {
    const episode = await this.episodeRepository.findOne({
      where: { code },
      relations: ['sequences'],
    });

    if (!episode) {
      throw new NotFoundException(`Episode with code ${code} not found`);
    }

    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(episode.projectId, userContext);
    }

    (episode as any).notes = await this.loadNotesForEntity(episode.id.toString(), 'Episode');
    const sequences = episode.sequences;

    for (const sequence of sequences || []) {

      (sequence as any).notes = await this.loadNotesForEntity(sequence.id.toString(), 'Sequence');

    }

    return episode;
  }

  async update(id: number, updateEpisodeDto: UpdateEpisodeDto, userContext?: UserContext): Promise<Episode> {
    const episode = await this.episodeRepository.findOne({ where: { id } });
    
    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        episode.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    const updateData: any = {};

    if (updateEpisodeDto.code) {
      const existingCode = await this.episodeRepository.findOne({
        where: { code: updateEpisodeDto.code },
      });
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(`Episode with code '${updateEpisodeDto.code}' already exists`);
      }
      updateData.code = updateEpisodeDto.code;
    }
    if (updateEpisodeDto.name) updateData.name = updateEpisodeDto.name;
    if (updateEpisodeDto.description !== undefined)
      updateData.description = updateEpisodeDto.description;
    if (updateEpisodeDto.statusId) updateData.statusId = updateEpisodeDto.statusId;
    if (updateEpisodeDto.duration !== undefined) updateData.duration = updateEpisodeDto.duration;
    if (updateEpisodeDto.cutOrder !== undefined) updateData.cutOrder = updateEpisodeDto.cutOrder;
    if (updateEpisodeDto.epNumber !== undefined) updateData.epNumber = updateEpisodeDto.epNumber;
    if (updateEpisodeDto.assignedTo !== undefined)
      updateData.assignedTo = updateEpisodeDto.assignedTo;

    if (updateEpisodeDto.projectId && updateEpisodeDto.projectId !== episode.projectId) {
      if (userContext) {
        await this.projectAccessService.verifyProjectAccess(
          updateEpisodeDto.projectId,
          userContext,
          ProjectRole.CONTRIBUTOR,
        );
      }
      const project = await this.projectRepository.findOne({
        where: { id: updateEpisodeDto.projectId },
      });
      if (!project) {
        throw new NotFoundException(`Project with ID ${updateEpisodeDto.projectId} not found`);
      }
      updateData.projectId = updateEpisodeDto.projectId;
    }

    await this.episodeRepository.update(id, updateData);
    return await this.findOneById(id, userContext);
  }

  async remove(id: number, userContext?: UserContext): Promise<void> {
    const episode = await this.episodeRepository.findOne({ where: { id } });
    
    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        episode.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    await this.episodeRepository.delete(id);
  }

  async updateEpisodeDuration(episodeId: number, userContext?: UserContext): Promise<Episode> {
    const sequences = await this.sequenceRepository.find({
      where: { episode: { id: episodeId } },
      select: ['duration'],
    });

    const totalDuration = sequences.reduce(
      (total, sequence) => total + (sequence.duration || 0),
      0,
    );

    await this.episodeRepository.update(episodeId, { duration: totalDuration });
    return this.findOneById(episodeId, userContext);
  }

  async findOneWithCalculatedDuration(id: number, userContext?: UserContext): Promise<Episode> {
    await this.findOneById(id, userContext);
    return this.updateEpisodeDuration(id, userContext);
  }
}
