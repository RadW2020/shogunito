import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Playlist, Project, Version, Status } from '../entities';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { FilterPlaylistsDto } from './dto/filter-playlists.dto';
import { CreatePlaylistFromVersionsDto } from './dto/create-playlist-from-versions.dto';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';
import { ProjectRole } from '../entities/project-permission.entity';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist)
    private playlistRepository: Repository<Playlist>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
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

  async create(
    createPlaylistDto: CreatePlaylistDto,
    userContext?: UserContext,
  ): Promise<Playlist> {
    // Verify project access
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        createPlaylistDto.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    // Check for duplicate code
    if (createPlaylistDto.code) {
      const existingPlaylist = await this.playlistRepository.findOne({
        where: { code: createPlaylistDto.code },
      });
      if (existingPlaylist) {
        throw new ConflictException(
          `Playlist with code '${createPlaylistDto.code}' already exists`,
        );
      }
    }

    // Get the project reference
    const project = await this.projectRepository.findOne({
      where: { id: createPlaylistDto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${createPlaylistDto.projectId} not found`);
    }

    const userId = userContext?.userId || null;

    // Get statusId for version
    const versionStatusId = await this.getStatusIdByCode('wip');

    // Create initial version for the playlist
    const initialVersion = this.versionRepository.create({
      code: `${createPlaylistDto.code}_001`,
      name: `Initial version of ${createPlaylistDto.name}`,
      description: 'Initial version created automatically',
      versionNumber: 1,
      statusId: versionStatusId,
      latest: true,
      createdBy: userId,
      entityCode: createPlaylistDto.code,
      entityType: 'playlist',
    });
    const savedVersion = await this.versionRepository.save(initialVersion);

    // Include the initial version code in versionCodes
    const versionCodes = createPlaylistDto.versionCodes
      ? [...createPlaylistDto.versionCodes, savedVersion.code]
      : [savedVersion.code];

    const playlistStatusId = createPlaylistDto.statusId || null;

    const playlist = this.playlistRepository.create({
      code: createPlaylistDto.code,
      name: createPlaylistDto.name,
      description: createPlaylistDto.description,
      statusId: playlistStatusId,
      versionCodes,
      createdBy: userId,
      assignedTo: createPlaylistDto.assignedTo,
      projectId: createPlaylistDto.projectId,
    });
    const savedPlaylist = await this.playlistRepository.save(playlist);

    // Add projectId for frontend compatibility
    return {
      ...savedPlaylist,
      projectId: savedPlaylist.projectId,
    };
  }

  async findAll(filters?: FilterPlaylistsDto, userContext?: UserContext): Promise<Playlist[]> {
    const queryBuilder = this.playlistRepository
      .createQueryBuilder('playlist')
      .orderBy('playlist.createdAt', 'DESC');

    // Filter by accessible project IDs
    if (userContext) {
      const accessibleProjectIds = await this.projectAccessService.getAccessibleProjectIds(
        userContext,
      );
      if (accessibleProjectIds.length === 0) {
        return [];
      }
      queryBuilder.andWhere('playlist.projectId IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    if (filters?.status) {
      const statusId = await this.getStatusIdByCode(filters.status);
      if (statusId) {
        queryBuilder.andWhere('playlist.statusId = :statusId', {
          statusId: statusId,
        });
      }
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
      queryBuilder.andWhere('playlist.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters?.createdBy) {
      queryBuilder.andWhere('playlist.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    if (filters?.assignedTo) {
      queryBuilder.andWhere('playlist.assignedTo = :assignedTo', {
        assignedTo: filters.assignedTo,
      });
    }

    if (filters?.code) {
      queryBuilder.andWhere('playlist.code ILIKE :code', {
        code: `%${filters.code}%`,
      });
    }

    if (filters?.name) {
      queryBuilder.andWhere('playlist.name ILIKE :name', {
        name: `%${filters.name}%`,
      });
    }

    const playlists = await queryBuilder.getMany();

    // Add projectId and versions to each playlist for frontend compatibility
    const playlistsWithVersions = await Promise.all(
      playlists.map(async (playlist) => {
        // Get all versions for this playlist
        const versions =
          playlist.versionCodes && playlist.versionCodes.length > 0
            ? await this.versionRepository.findBy({
                code: In(playlist.versionCodes),
              })
            : [];

        return {
          ...playlist,
          projectId: playlist.projectId,
          versions,
        };
      }),
    );

    return playlistsWithVersions;
  }

  async findOneById(id: number, userContext?: UserContext): Promise<Playlist & { versions: Version[] }> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid playlist ID');
    }

    const playlist = await this.playlistRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${id} not found`);
    }

    // Verify project access
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        playlist.projectId,
        userContext,
        ProjectRole.VIEWER,
      );
    }

    // Obtener todas las versiones de la playlist
    const versions =
      playlist.versionCodes && playlist.versionCodes.length > 0
        ? await this.versionRepository.findBy({
            code: In(playlist.versionCodes),
          })
        : [];

    return {
      ...playlist,
      versions,
    } as Playlist & { versions: Version[] };
  }

  async findOne(code: string): Promise<Playlist & { versions: Version[] }> {
    const playlist = await this.playlistRepository.findOne({
      where: { code },
      relations: ['project'],
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with code ${code} not found`);
    }

    // Obtener todas las versiones de la playlist
    const versions =
      playlist.versionCodes && playlist.versionCodes.length > 0
        ? await this.versionRepository.findBy({
            code: In(playlist.versionCodes),
          })
        : [];

    return {
      ...playlist,
      versions,
    } as Playlist & { versions: Version[] };
  }

  async update(
    id: number,
    updatePlaylistDto: UpdatePlaylistDto,
    userContext?: UserContext,
  ): Promise<Playlist> {
    const playlist = await this.findOneById(id, userContext);

    // Verify access to current project
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        playlist.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    const updateData: any = {};

    if (updatePlaylistDto.code !== undefined) {
      const existingCode = await this.playlistRepository.findOne({
        where: { code: updatePlaylistDto.code },
      });
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(
          `Playlist with code '${updatePlaylistDto.code}' already exists`,
        );
      }
      updateData.code = updatePlaylistDto.code;
    }
    if (updatePlaylistDto.name !== undefined) updateData.name = updatePlaylistDto.name;
    if (updatePlaylistDto.description !== undefined)
      updateData.description = updatePlaylistDto.description;
    if (updatePlaylistDto.statusId !== undefined) {
      updateData.statusId = updatePlaylistDto.statusId;
      updateData.statusUpdatedAt = new Date();
    }
    if (updatePlaylistDto.versionCodes !== undefined)
      updateData.versionCodes = updatePlaylistDto.versionCodes;
    // createdBy should not be updated - it's set automatically on creation
    if (updatePlaylistDto.assignedTo !== undefined)
      updateData.assignedTo = updatePlaylistDto.assignedTo;
    if (updatePlaylistDto.statusUpdatedAt !== undefined)
      updateData.statusUpdatedAt = updatePlaylistDto.statusUpdatedAt;

    // Handle project relation update
    if (updatePlaylistDto.projectId !== undefined) {
      // Verify access to new project
      if (userContext) {
        await this.projectAccessService.verifyProjectAccess(
          updatePlaylistDto.projectId,
          userContext,
          ProjectRole.CONTRIBUTOR,
        );
      }
      const project = await this.projectRepository.findOne({
        where: { id: updatePlaylistDto.projectId },
      });
      if (!project) {
        throw new NotFoundException(`Project with ID ${updatePlaylistDto.projectId} not found`);
      }
      updateData.projectId = updatePlaylistDto.projectId;
    }

    await this.playlistRepository.update(id, updateData);
    return await this.findOneById(id, userContext);
  }

  async remove(id: number, userContext?: UserContext): Promise<void> {
    const playlist = await this.findOneById(id, userContext);

    // Verify access
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        playlist.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    const result = await this.playlistRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Playlist with ID ${id} not found`);
    }
  }

  // Métodos para gestionar versiones en la playlist
  async addVersion(
    id: number,
    versionCode: string,
    position?: number,
    userContext?: UserContext,
  ): Promise<Playlist> {
    const playlist = await this.findOneById(id, userContext);

    // Verify access
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        playlist.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    // Verificar que la versión existe
    const version = await this.versionRepository.findOne({
      where: { code: versionCode },
    });

    if (!version) {
      throw new NotFoundException(`Version with code ${versionCode} not found`);
    }

    // Verificar que no esté ya en la playlist
    if (playlist.versionCodes.includes(versionCode)) {
      throw new BadRequestException(
        `Version ${versionCode} is already in playlist ${playlist.code}`,
      );
    }

    // Agregar la versión en la posición especificada o al final
    const newVersionCodes = [...(playlist.versionCodes || [])];
    if (position !== undefined && position >= 0 && position <= newVersionCodes.length) {
      newVersionCodes.splice(position, 0, versionCode);
    } else {
      newVersionCodes.push(versionCode);
    }

    await this.playlistRepository.update(id, {
      versionCodes: newVersionCodes,
    });

    return this.findOneById(id, userContext);
  }

  async removeVersion(
    id: number,
    versionCode: string,
    userContext?: UserContext,
  ): Promise<Playlist> {
    const playlist = await this.findOneById(id, userContext);

    // Verify access
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        playlist.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    const newVersionCodes = (playlist.versionCodes || []).filter((code) => code !== versionCode);
    await this.playlistRepository.update(id, {
      versionCodes: newVersionCodes,
    });

    return this.findOneById(id, userContext);
  }

  async reorderVersions(
    id: number,
    versionCodes: string[],
    userContext?: UserContext,
  ): Promise<Playlist> {
    const playlist = await this.findOneById(id, userContext);

    // Verify access
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        playlist.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    // Verificar que todas las versiones existen
    const existingVersions = await this.versionRepository.findBy({
      code: In(versionCodes),
    });
    if (existingVersions.length !== versionCodes.length) {
      throw new BadRequestException('One or more versions do not exist');
    }

    await this.playlistRepository.update(id, { versionCodes });

    return this.findOneById(id, userContext);
  }

  async createFromVersions(
    createPlaylistFromVersionsDto: CreatePlaylistFromVersionsDto,
    userContext?: UserContext,
  ): Promise<Playlist> {
    // Verify project access
    if (userContext) {
      await this.projectAccessService.verifyProjectAccess(
        createPlaylistFromVersionsDto.projectId,
        userContext,
        ProjectRole.CONTRIBUTOR,
      );
    }

    // Verificar que el proyecto existe
    const project = await this.projectRepository.findOne({
      where: { id: createPlaylistFromVersionsDto.projectId },
    });

    if (!project) {
      throw new NotFoundException(
        `Project with ID ${createPlaylistFromVersionsDto.projectId} not found`,
      );
    }

    const userId = userContext?.userId || null;

    // Verificar que todas las versiones existen
    const versions = await this.versionRepository.findBy({
      code: In(createPlaylistFromVersionsDto.versionCodes),
    });

    if (versions.length !== createPlaylistFromVersionsDto.versionCodes.length) {
      throw new BadRequestException(
        'One or more versions do not exist. Please verify all version codes.',
      );
    }

    // Get statusId for playlist
    const playlistStatusId = createPlaylistFromVersionsDto.statusId || null;

    // Crear la playlist con las versiones seleccionadas
    const playlist = this.playlistRepository.create({
      code: createPlaylistFromVersionsDto.code,
      name: createPlaylistFromVersionsDto.name,
      description: createPlaylistFromVersionsDto.description,
      statusId: playlistStatusId,
      versionCodes: createPlaylistFromVersionsDto.versionCodes,
      createdBy: userId,
      assignedTo: createPlaylistFromVersionsDto.assignedTo,
      projectId: createPlaylistFromVersionsDto.projectId,
    });

    const savedPlaylist = await this.playlistRepository.save(playlist);

    // Retornar con projectId para compatibilidad con frontend
    return {
      ...savedPlaylist,
      projectId: savedPlaylist.projectId,
    };
  }
}
