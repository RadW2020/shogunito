import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { Note, LinkType, NoteType } from '../entities/note.entity';
import { Project } from '../entities/project.entity';
import { Episode } from '../entities/episode.entity';
import { Sequence } from '../entities/sequence.entity';
import { Shot } from '../entities/shot.entity';
import { Version } from '../entities/version.entity';
import { Asset } from '../entities/asset.entity';
import { Playlist } from '../entities/playlist.entity';
import { NotFoundException } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { FilterNotesDto } from './dto/filter-notes.dto';
import { MinioService } from '../files/minio.service';
import { ProjectAccessService } from '../auth/services/project-access.service';

describe('NotesService', () => {
  let service: NotesService;
  let noteRepository: any;
  let projectRepository: any;
  let episodeRepository: any;
  let sequenceRepository: any;
  let shotRepository: any;
  let versionRepository: any;
  let assetRepository: any;
  let playlistRepository: any;

  const mockProject: Project = {
    id: 123,
    code: 'PROJ_001',
  } as Project;

  const mockNote: Note = {
    id: 'note-123',
    linkId: '123',
    linkType: LinkType.PROJECT,
    subject: 'Test Note',
    content: 'Test content',
    noteType: NoteType.NOTE,
    isRead: false,
    projectId: 123,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Note;

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        {
          provide: getRepositoryToken(Note),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Episode),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Sequence),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Shot),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Version),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Asset),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Playlist),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: MinioService,
          useValue: {
            extractBucketAndPath: jest
              .fn()
              .mockImplementation((path: string, defaultBucket?: string) => {
                if (!path) return null;
                const pathOnly = path.includes('/') ? path.split('/').pop() || path : path;
                return { bucket: defaultBucket || 'attachments', path: pathOnly };
              }),
            deleteFile: jest.fn().mockResolvedValue(undefined),
            getFileUrl: jest.fn().mockResolvedValue('http://localhost:9000/attachments/test.jpg'),
          },
        },
        {
          provide: ProjectAccessService,
          useValue: {
            isAdmin: jest.fn().mockReturnValue(false),
            getAccessibleProjectIds: jest.fn().mockResolvedValue([]),
            verifyProjectAccess: jest.fn().mockResolvedValue(undefined),
            verifyNoteAccess: jest.fn().mockResolvedValue(undefined),
            getProjectIdFromVersion: jest.fn().mockResolvedValue(123),
          },
        },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
    noteRepository = module.get(getRepositoryToken(Note));
    projectRepository = module.get(getRepositoryToken(Project));
    episodeRepository = module.get(getRepositoryToken(Episode));
    sequenceRepository = module.get(getRepositoryToken(Sequence));
    shotRepository = module.get(getRepositoryToken(Shot));
    versionRepository = module.get(getRepositoryToken(Version));
    assetRepository = module.get(getRepositoryToken(Asset));
    playlistRepository = module.get(getRepositoryToken(Playlist));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a note successfully for Project', async () => {
      const createDto: CreateNoteDto = {
        linkId: '123',
        linkType: LinkType.PROJECT,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      noteRepository.create.mockReturnValue(mockNote);
      noteRepository.save.mockResolvedValue(mockNote);

      const result = await service.create(createDto, undefined);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
      });
      expect(noteRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdBy: null,
      });
      expect(noteRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockNote);
    });

    it('should throw NotFoundException when linked entity not found', async () => {
      const createDto: CreateNoteDto = {
        linkId: '999',
        linkType: LinkType.PROJECT,
        subject: 'Test Note',
        content: 'Test content',
      };

      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Project with ID 999 not found');
    });

    it('should validate Project by numeric ID', async () => {
      const createDto: CreateNoteDto = {
        linkId: '123',
        linkType: LinkType.PROJECT,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      const mockProjectById = { id: 123, code: 'PROJ_001' };
      projectRepository.findOne.mockResolvedValue(mockProjectById);
      noteRepository.create.mockReturnValue(mockNote);
      noteRepository.save.mockResolvedValue(mockNote);

      await service.create(createDto, undefined);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
      });
    });

    it('should validate Episode by numeric ID', async () => {
      const createDto: CreateNoteDto = {
        linkId: '456',
        linkType: LinkType.EPISODE,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      const mockEpisode = { id: 456, code: 'EP_001' };
      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      noteRepository.create.mockReturnValue(mockNote);
      noteRepository.save.mockResolvedValue(mockNote);

      await service.create(createDto, undefined);

      expect(episodeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 456 },
      });
    });

    it('should throw BadRequestException when ID is not numeric', async () => {
      const createDto: CreateNoteDto = {
        linkId: 'EP_001',
        linkType: LinkType.EPISODE,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      await expect(service.create(createDto)).rejects.toThrow(
        'Invalid Episode ID: EP_001. Must be a valid integer.',
      );
    });

    it('should validate Sequence by numeric ID', async () => {
      const createDto: CreateNoteDto = {
        linkId: '789',
        linkType: LinkType.SEQUENCE,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      const mockSequence = { id: 789, code: 'SEQ_001' };
      sequenceRepository.findOne.mockResolvedValue(mockSequence);
      noteRepository.create.mockReturnValue(mockNote);
      noteRepository.save.mockResolvedValue(mockNote);

      await service.create(createDto, undefined);

      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 789 },
      });
    });

    it('should throw BadRequestException when Sequence ID is not numeric', async () => {
      const createDto: CreateNoteDto = {
        linkId: 'SEQ_001',
        linkType: LinkType.SEQUENCE,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      await expect(service.create(createDto)).rejects.toThrow(
        'Invalid Sequence ID: SEQ_001. Must be a valid integer.',
      );
    });

    it('should validate Shot by numeric ID', async () => {
      const createDto: CreateNoteDto = {
        linkId: '101',
        linkType: LinkType.SHOT,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      const mockShot = { id: 101, code: 'SH_001' };
      shotRepository.findOne.mockResolvedValue(mockShot);
      noteRepository.create.mockReturnValue(mockNote);
      noteRepository.save.mockResolvedValue(mockNote);

      await service.create(createDto, undefined);

      expect(shotRepository.findOne).toHaveBeenCalledWith({
        where: { id: 101 },
      });
    });

    it('should throw BadRequestException when Shot ID is not numeric', async () => {
      const createDto: CreateNoteDto = {
        linkId: 'SH_001',
        linkType: LinkType.SHOT,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      await expect(service.create(createDto)).rejects.toThrow(
        'Invalid Shot ID: SH_001. Must be a valid integer.',
      );
    });

    it('should validate Version by numeric ID', async () => {
      const createDto: CreateNoteDto = {
        linkId: '202',
        linkType: LinkType.VERSION,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      const mockVersion = { id: 202, code: 'VER_001' };
      versionRepository.findOne.mockResolvedValue(mockVersion);
      noteRepository.create.mockReturnValue(mockNote);
      noteRepository.save.mockResolvedValue(mockNote);

      await service.create(createDto, undefined);

      expect(versionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 202 },
      });
    });

    it('should throw BadRequestException when Version ID is not numeric', async () => {
      const createDto: CreateNoteDto = {
        linkId: 'VER_001',
        linkType: LinkType.VERSION,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      await expect(service.create(createDto)).rejects.toThrow(
        'Invalid Version ID: VER_001. Must be a valid integer.',
      );
    });

    it('should validate Asset by numeric ID', async () => {
      const createDto: CreateNoteDto = {
        linkId: '303',
        linkType: LinkType.ASSET,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      const mockAsset = { id: 303, code: 'AST_001' };
      assetRepository.findOne.mockResolvedValue(mockAsset);
      noteRepository.create.mockReturnValue(mockNote);
      noteRepository.save.mockResolvedValue(mockNote);

      await service.create(createDto, undefined);

      expect(assetRepository.findOne).toHaveBeenCalledWith({
        where: { id: 303 },
      });
    });

    it('should throw BadRequestException when Asset ID is not numeric', async () => {
      const createDto: CreateNoteDto = {
        linkId: 'AST_001',
        linkType: LinkType.ASSET,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      await expect(service.create(createDto)).rejects.toThrow(
        'Invalid Asset ID: AST_001. Must be a valid integer.',
      );
    });

    it('should validate Playlist by numeric ID', async () => {
      const createDto: CreateNoteDto = {
        linkId: '404',
        linkType: LinkType.PLAYLIST,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      const mockPlaylist = { id: 404, code: 'PL_001' };
      playlistRepository.findOne.mockResolvedValue(mockPlaylist);
      noteRepository.create.mockReturnValue(mockNote);
      noteRepository.save.mockResolvedValue(mockNote);

      await service.create(createDto, undefined);

      expect(playlistRepository.findOne).toHaveBeenCalledWith({
        where: { id: 404 },
      });
    });

    it('should throw BadRequestException when Playlist ID is not numeric', async () => {
      const createDto: CreateNoteDto = {
        linkId: 'PL_001',
        linkType: LinkType.PLAYLIST,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      await expect(service.create(createDto)).rejects.toThrow(
        'Invalid Playlist ID: PL_001. Must be a valid integer.',
      );
    });

    it('should throw NotFoundException for invalid link type', async () => {
      const createDto: CreateNoteDto = {
        linkId: '123',
        linkType: 'InvalidType' as any,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Invalid link type: InvalidType');
    });

    it('should throw NotFoundException when entity not found by ID', async () => {
      const createDto: CreateNoteDto = {
        linkId: '999',
        linkType: LinkType.PROJECT,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Project with ID 999 not found');
    });
  });

  describe('findAll', () => {
    it('should return all notes without filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockNote]);

      const result = await service.findAll(undefined, undefined);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(result).toEqual([mockNote]);
    });

    it('should apply linkId filter', async () => {
      const filters: FilterNotesDto = {
        linkId: '123',
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockNote]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('note.linkId = :linkId', {
        linkId: '123',
      });
    });

    it('should apply linkType filter', async () => {
      const filters: FilterNotesDto = {
        linkType: LinkType.PROJECT,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockNote]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('note.linkType = :linkType', {
        linkType: LinkType.PROJECT,
      });
    });

    it('should apply isRead filter', async () => {
      const filters: FilterNotesDto = {
        isRead: false,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockNote]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('note.isRead = :isRead', {
        isRead: false,
      });
    });
  });

  describe('findOne', () => {
    it('should return a note by id', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);

      const result = await service.findOne('note-123', undefined);

      expect(noteRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'note-123' },
      });
      expect(result).toEqual(mockNote);
    });

    it('should throw NotFoundException when note not found', async () => {
      noteRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('note-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a note successfully', async () => {
      const updateDto: UpdateNoteDto = {
        subject: 'Updated Subject',
        isRead: true,
      };

      const updatedNote = { ...mockNote, ...updateDto };

      // update method calls update then findOne at the end
      noteRepository.update.mockResolvedValue({ affected: 1 });
      noteRepository.findOne.mockResolvedValue(updatedNote);

      const result = await service.update('note-123', updateDto, undefined);

      expect(noteRepository.update).toHaveBeenCalledWith('note-123', updateDto);
      expect(noteRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'note-123' },
      });
      expect(result).toEqual(updatedNote);
    });
  });

  describe('remove', () => {
    it('should delete a note successfully', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('note-123', undefined);

      expect(noteRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'note-123' },
      });
      expect(noteRepository.delete).toHaveBeenCalledWith('note-123');
    });

    it('should throw NotFoundException when note not found', async () => {
      noteRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('note-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadAttachment', () => {
    it('should upload attachment to note', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      } as any;

      noteRepository.findOne.mockResolvedValue(mockNote);
      const mockMinioService = {
        uploadFile: jest.fn().mockResolvedValue({
          url: 'http://localhost:9000/attachments/test.pdf',
        }),
        getValidationOptions: jest.fn().mockReturnValue({
          allowedTypes: ['application/pdf'],
          maxSize: 100 * 1024 * 1024,
        }),
      };

      // Replace MinioService mock
      const module = await Test.createTestingModule({
        providers: [
          NotesService,
          {
            provide: getRepositoryToken(Note),
            useValue: noteRepository,
          },
          {
            provide: getRepositoryToken(Project),
            useValue: projectRepository,
          },
          {
            provide: getRepositoryToken(Episode),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: getRepositoryToken(Sequence),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: getRepositoryToken(Shot),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: getRepositoryToken(Version),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: getRepositoryToken(Asset),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: getRepositoryToken(Playlist),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: MinioService,
            useValue: mockMinioService,
          },
          {
            provide: ProjectAccessService,
            useValue: {
              isAdmin: jest.fn().mockReturnValue(false),
              getAccessibleProjectIds: jest.fn().mockResolvedValue([]),
              verifyProjectAccess: jest.fn().mockResolvedValue(undefined),
              verifyNoteAccess: jest.fn().mockResolvedValue(undefined),
              getProjectIdFromVersion: jest.fn().mockResolvedValue(123),
            },
          },
        ],
      }).compile();

      const testService = module.get<NotesService>(NotesService);
      noteRepository.update.mockResolvedValue({ affected: 1 });

      const result = await testService.uploadAttachment('note-123', mockFile);

      expect(mockMinioService.uploadFile).toHaveBeenCalled();
      expect(noteRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('removeAttachment', () => {
    it('should remove attachment from note', async () => {
      const noteWithAttachment = {
        ...mockNote,
        attachments: ['http://localhost:9000/attachments/test.pdf'],
      };

      noteRepository.findOne.mockResolvedValueOnce(noteWithAttachment).mockResolvedValueOnce({
        ...noteWithAttachment,
        attachments: [],
      });

      const mockMinioService = {
        extractBucketAndPath: jest
          .fn()
          .mockImplementation((path: string, defaultBucket?: string) => {
            if (!path) return null;
            const pathOnly = path.includes('/') ? path.split('/').pop() || path : path;
            return { bucket: defaultBucket || 'attachments', path: pathOnly };
          }),
        deleteFile: jest.fn().mockResolvedValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          NotesService,
          {
            provide: getRepositoryToken(Note),
            useValue: noteRepository,
          },
          {
            provide: getRepositoryToken(Project),
            useValue: projectRepository,
          },
          {
            provide: getRepositoryToken(Episode),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: getRepositoryToken(Sequence),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: getRepositoryToken(Shot),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: getRepositoryToken(Version),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: getRepositoryToken(Asset),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: getRepositoryToken(Playlist),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: MinioService,
            useValue: mockMinioService,
          },
          {
            provide: ProjectAccessService,
            useValue: {
              isAdmin: jest.fn().mockReturnValue(false),
              getAccessibleProjectIds: jest.fn().mockResolvedValue([]),
              verifyProjectAccess: jest.fn().mockResolvedValue(undefined),
              verifyNoteAccess: jest.fn().mockResolvedValue(undefined),
              getProjectIdFromVersion: jest.fn().mockResolvedValue(123),
            },
          },
        ],
      }).compile();

      const testService = module.get<NotesService>(NotesService);
      noteRepository.update.mockResolvedValue({ affected: 1 });

      const result = await testService.removeAttachment(
        'note-123',
        'http://localhost:9000/attachments/test.pdf',
      );

      expect(noteRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when attachment not found', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);

      await expect(
        service.removeAttachment('note-123', 'http://localhost:9000/attachments/nonexistent.pdf'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEntity', () => {
    it('should return notes for a specific entity', async () => {
      noteRepository.find.mockResolvedValue([mockNote]);

      const result = await service.findByEntity('123', LinkType.PROJECT);

      expect(noteRepository.find).toHaveBeenCalledWith({
        where: { linkId: '123', linkType: LinkType.PROJECT },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockNote]);
    });
  });
});
