import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note, LinkType } from '../entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { FilterNotesDto } from './dto/filter-notes.dto';
import { MinioService } from '../files/minio.service';
import { Project } from '../entities/project.entity';
import { Episode } from '../entities/episode.entity';
import { Sequence } from '../entities/sequence.entity';
import { Version } from '../entities/version.entity';
import { Asset } from '../entities/asset.entity';
import { Playlist } from '../entities/playlist.entity';
import { ProjectRole } from '../entities/project-permission.entity';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private noteRepository: Repository<Note>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Episode)
    private episodeRepository: Repository<Episode>,
    @InjectRepository(Sequence)
    private sequenceRepository: Repository<Sequence>,
    @InjectRepository(Version)
    private versionRepository: Repository<Version>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(Playlist)
    private playlistRepository: Repository<Playlist>,
    private minioService: MinioService,
    private projectAccessService: ProjectAccessService,
  ) {}

  async create(createNoteDto: CreateNoteDto, userContext?: UserContext): Promise<Note> {
    // Validate that the linked entity exists
    await this.validateLinkedEntity(createNoteDto.linkId, createNoteDto.linkType);

    // Verify user has contributor access to the linked entity's project
    if (userContext) {
      await this.verifyNoteEntityAccess(createNoteDto.linkId, createNoteDto.linkType, userContext, ProjectRole.CONTRIBUTOR);
    }

    const note = this.noteRepository.create({
      ...createNoteDto,
      createdBy: userContext?.userId || null,
    });
    const savedNote = await this.noteRepository.save(note);
    return await this.transformNote(savedNote);
  }

  /**
   * Transform note to regenerate attachment URLs to ensure they don't expire
   */
  private async transformNote(note: Note): Promise<Note> {
    if (note.attachments && note.attachments.length > 0) {
      try {
        const regeneratedAttachments = await Promise.all(
          note.attachments.map(async (attachmentPathOrUrl) => {
            // Extract bucket and path, defaulting to 'attachments' bucket
            const fileInfo = this.minioService.extractBucketAndPath(
              attachmentPathOrUrl,
              'attachments',
            );
            if (fileInfo) {
              return await this.minioService.getFileUrl(fileInfo.bucket, fileInfo.path);
            }
            return attachmentPathOrUrl; // Keep original if extraction fails
          }),
        );
        note.attachments = regeneratedAttachments;
      } catch (error) {
        // Log error but don't fail - keep original paths/URLs
        console.warn(`Failed to regenerate attachment URLs for note ${note.id}:`, error);
      }
    }
    return note;
  }

  async findAll(filters?: FilterNotesDto, userContext?: UserContext): Promise<Note[]> {
    const queryBuilder = this.noteRepository
      .createQueryBuilder('note')
      .orderBy('note.createdAt', 'DESC');

    if (filters?.linkId) {
      queryBuilder.andWhere('note.linkId = :linkId', {
        linkId: filters.linkId,
      });
    }

    if (filters?.linkType) {
      queryBuilder.andWhere('note.linkType = :linkType', {
        linkType: filters.linkType,
      });
    }

    if (filters?.noteType) {
      queryBuilder.andWhere('note.noteType = :noteType', {
        noteType: filters.noteType,
      });
    }

    if (filters?.isRead !== undefined) {
      queryBuilder.andWhere('note.isRead = :isRead', {
        isRead: filters.isRead,
      });
    }

    if (filters?.createdBy) {
      queryBuilder.andWhere('note.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    if (filters?.assignedTo) {
      queryBuilder.andWhere('note.assignedTo = :assignedTo', {
        assignedTo: filters.assignedTo,
      });
    }

    if (filters?.subject) {
      queryBuilder.andWhere('note.subject ILIKE :subject', {
        subject: `%${filters.subject}%`,
      });
    }

    if (filters?.content) {
      queryBuilder.andWhere('note.content ILIKE :content', {
        content: `%${filters.content}%`,
      });
    }

    if (filters?.hasAttachments !== undefined) {
      if (filters.hasAttachments) {
        queryBuilder.andWhere('note.attachments IS NOT NULL AND note.attachments != :empty', {
          empty: '{}',
        });
      } else {
        queryBuilder.andWhere('(note.attachments IS NULL OR note.attachments = :empty)', {
          empty: '{}',
        });
      }
    }

    const notes = await queryBuilder.getMany();

    // Filter by user's accessible projects (unless admin)
    let filteredNotes = notes;
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds = await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return [];
      }

      // Filter notes by checking if their linked entity's project is accessible
      filteredNotes = [];
      for (const note of notes) {
        try {
          const projectId = await this.getProjectIdFromNote(note);
          if (projectId && accessibleProjectIds.includes(projectId)) {
            filteredNotes.push(note);
          }
        } catch (error) {
          // Skip notes where we can't determine project access
          continue;
        }
      }
    }

    // Regenerate URLs for all notes
    const transformedNotes = [];
    for (const note of filteredNotes) {
      transformedNotes.push(await this.transformNote(note));
    }
    return transformedNotes;
  }

  async findOne(id: string, userContext?: UserContext): Promise<Note> {
    const note = await this.noteRepository.findOne({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    // Verify user has access to this note's linked entity's project
    if (userContext) {
      await this.verifyNoteEntityAccess(note.linkId, note.linkType, userContext);
    }

    return await this.transformNote(note);
  }

  async update(id: string, updateNoteDto: UpdateNoteDto, userContext?: UserContext): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { id } });
    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    // Verify user has contributor access
    if (userContext) {
      await this.verifyNoteEntityAccess(note.linkId, note.linkType, userContext, ProjectRole.CONTRIBUTOR);
    }

    await this.noteRepository.update(id, updateNoteDto);
    const updatedNote = await this.noteRepository.findOne({ where: { id } });
    if (!updatedNote) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }
    return await this.transformNote(updatedNote);
  }

  async remove(id: string, userContext?: UserContext): Promise<void> {
    const note = await this.noteRepository.findOne({ where: { id } });
    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    // Verify user has contributor access
    if (userContext) {
      await this.verifyNoteEntityAccess(note.linkId, note.linkType, userContext, ProjectRole.CONTRIBUTOR);
    }

    const result = await this.noteRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }
  }

  async uploadAttachment(id: string, file: File): Promise<Note> {
    // Check if note exists
    const note = await this.findOne(id);

    // Upload attachment to MinIO
    const uploadResult = await this.minioService.uploadFile(
      'attachments',
      file,
      undefined,
      this.minioService.getValidationOptions('attachment'),
    );

    // Store only the path (not the URL) - URL will be generated on-demand
    const currentAttachments = note.attachments || [];
    const updatedAttachments = [...currentAttachments, uploadResult.path];

    // Update note with new attachment
    await this.noteRepository.update(id, {
      attachments: updatedAttachments,
    });

    // Return updated note with regenerated URLs
    const updatedNote = await this.noteRepository.findOne({ where: { id } });
    if (!updatedNote) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }
    return await this.transformNote(updatedNote);
  }

  async removeAttachment(id: string, attachmentId: string): Promise<Note> {
    // Check if note exists
    const note = await this.findOne(id);

    if (!note.attachments || !note.attachments.includes(attachmentId)) {
      throw new NotFoundException(`Attachment ${attachmentId} not found in note ${id}`);
    }

    // Extract bucket and path for deletion from MinIO
    const attachmentInfo = this.minioService.extractBucketAndPath(attachmentId, 'attachments');
    if (attachmentInfo) {
      try {
        await this.minioService.deleteFile(attachmentInfo.bucket, attachmentInfo.path);
      } catch (error) {
        console.warn('Failed to delete attachment from MinIO:', error);
      }
    }

    // Remove attachment from array
    const updatedAttachments = note.attachments.filter((attachment) => attachment !== attachmentId);

    // Update note
    await this.noteRepository.update(id, {
      attachments: updatedAttachments,
    });

    // Return updated note with regenerated URLs
    const updatedNote = await this.noteRepository.findOne({ where: { id } });
    if (!updatedNote) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }
    return await this.transformNote(updatedNote);
  }

  async findByEntity(linkId: string, linkType: LinkType, userContext?: UserContext): Promise<Note[]> {
    // Verify user has access to the linked entity's project
    if (userContext) {
      await this.verifyNoteEntityAccess(linkId, linkType, userContext);
    }

    const notes = await this.noteRepository.find({
      where: { linkId, linkType },
      order: { createdAt: 'DESC' },
    });

    // Regenerate URLs for all notes
    const transformedNotes = [];
    for (const note of notes) {
      transformedNotes.push(await this.transformNote(note));
    }
    return transformedNotes;
  }

  private async validateLinkedEntity(linkId: string, linkType: LinkType): Promise<void> {
    // Validate that the linked entity actually exists
    // linkId must be a valid integer ID (no fallback to code)
    const entityId = parseInt(linkId, 10);
    if (isNaN(entityId)) {
      throw new BadRequestException(`Invalid ${linkType} ID: ${linkId}. Must be a valid integer.`);
    }

    let entityExists = false;

    switch (linkType) {
      case LinkType.PROJECT:
        entityExists = !!(await this.projectRepository.findOne({
          where: { id: entityId },
        }));
        break;
      case LinkType.EPISODE:
        entityExists = !!(await this.episodeRepository.findOne({
          where: { id: entityId },
        }));
        break;
      case LinkType.SEQUENCE:
        entityExists = !!(await this.sequenceRepository.findOne({
          where: { id: entityId },
        }));
        break;
      case LinkType.ASSET:
        entityExists = !!(await this.assetRepository.findOne({
          where: { id: entityId },
        }));
        break;
      case LinkType.VERSION:
        entityExists = !!(await this.versionRepository.findOne({
          where: { id: entityId },
        }));
        break;
      case LinkType.PLAYLIST:
        entityExists = !!(await this.playlistRepository.findOne({
          where: { id: entityId },
        }));
        break;
      default:
        throw new BadRequestException(`Invalid link type: ${linkType as string}`);
    }

    if (!entityExists) {
      throw new NotFoundException(`${linkType} with ID ${linkId} not found`);
    }
  }

  /**
   * Get project ID from a note's linked entity
   */
  private async getProjectIdFromNote(note: Note): Promise<number | null> {
    const entityId = parseInt(note.linkId, 10);
    if (isNaN(entityId)) return null;

    switch (note.linkType) {
      case LinkType.PROJECT:
        return entityId;
      case LinkType.EPISODE:
        const episode = await this.episodeRepository.findOne({
          where: { id: entityId },
          select: ['projectId'],
        });
        return episode?.projectId || null;
      case LinkType.SEQUENCE:
        const sequence = await this.sequenceRepository.findOne({
          where: { id: entityId },
          relations: ['episode'],
          select: ['id'],
        });
        return (sequence as any)?.episode?.projectId || null;
      case LinkType.ASSET:
        const asset = await this.assetRepository.findOne({
          where: { id: entityId },
          select: ['projectId'],
        });
        return asset?.projectId || null;
      case LinkType.VERSION:
        const version = await this.versionRepository.findOne({
          where: { id: entityId },
          select: ['entityId', 'entityType'],
        });
        if (version && version.entityId && version.entityType) {
          return this.projectAccessService.getProjectIdFromVersion({
            entityId: version.entityId,
            entityType: version.entityType,
          });
        }
        return null;
      case LinkType.PLAYLIST:
        const playlist = await this.playlistRepository.findOne({
          where: { id: entityId },
          select: ['projectId'],
        });
        return playlist?.projectId || null;
      default:
        return null;
    }
  }

  /**
   * Verify user has access to a note's linked entity's project
   */
  private async verifyNoteEntityAccess(
    linkId: string,
    linkType: LinkType,
    userContext: UserContext,
    minRole: ProjectRole = ProjectRole.VIEWER,
  ): Promise<void> {
    const entityId = parseInt(linkId, 10);
    if (isNaN(entityId)) {
      throw new BadRequestException(`Invalid ${linkType} ID: ${linkId}`);
    }

    switch (linkType) {
      case LinkType.PROJECT:
        await this.projectAccessService.verifyProjectAccess(entityId, userContext, minRole);
        break;
      case LinkType.EPISODE:
        await this.projectAccessService.verifyEpisodeAccess(entityId, userContext, minRole);
        break;
      case LinkType.SEQUENCE:
        await this.projectAccessService.verifySequenceAccess(entityId, userContext, minRole);
        break;
      case LinkType.ASSET:
        const asset = await this.assetRepository.findOne({
          where: { id: entityId },
          select: ['projectId'],
        });
        if (!asset?.projectId) {
          throw new NotFoundException(`Asset with ID ${entityId} not found`);
        }
        await this.projectAccessService.verifyProjectAccess(asset.projectId, userContext, minRole);
        break;
      case LinkType.VERSION:
        const version = await this.versionRepository.findOne({
          where: { id: entityId },
          select: ['entityId', 'entityType'],
        });
        if (!version) {
          throw new NotFoundException(`Version with ID ${entityId} not found`);
        }
        if (version.entityId && version.entityType) {
          await this.projectAccessService.verifyVersionAccess(
            { entityId: version.entityId, entityType: version.entityType },
            userContext,
            minRole,
          );
        }
        break;
      case LinkType.PLAYLIST:
        const playlist = await this.playlistRepository.findOne({
          where: { id: entityId },
          select: ['projectId'],
        });
        if (!playlist?.projectId) {
          throw new NotFoundException(`Playlist with ID ${entityId} not found`);
        }
        await this.projectAccessService.verifyProjectAccess(playlist.projectId, userContext, minRole);
        break;
      default:
        throw new NotFoundException(`Invalid link type: ${linkType as string}`);
    }
  }
}
