import { Test, TestingModule } from '@nestjs/testing';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { FilterNotesDto } from './dto/filter-notes.dto';
import { Note, LinkType, NoteType } from '../entities/note.entity';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';

describe('NotesController', () => {
  let controller: NotesController;
  let service: NotesService;

  const mockNote: Note = {
    id: 'note-123',
    linkId: 'project-123',
    linkType: LinkType.PROJECT,
    subject: 'Test Note',
    content: 'Test content',
    noteType: NoteType.NOTE,
    isRead: false,
    projectId: 123,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Note;

  const mockNotesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [
        {
          provide: NotesService,
          useValue: mockNotesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserRateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotesController>(NotesController);
    service = module.get<NotesService>(NotesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a note successfully', async () => {
      const createDto: CreateNoteDto = {
        linkId: 'project-123',
        linkType: LinkType.PROJECT,
        subject: 'Test Note',
        content: 'Test content',
        noteType: NoteType.NOTE,
      };

      mockNotesService.create.mockResolvedValue(mockNote);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(mockNote);
    });
  });

  describe('findAll', () => {
    it('should return all notes without filters', async () => {
      const notes = [mockNote];
      mockNotesService.findAll.mockResolvedValue(notes);

      const result = await controller.findAll(undefined);

      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(notes);
    });

    it('should return filtered notes', async () => {
      const filters: FilterNotesDto = {
        linkId: 'project-123',
        linkType: LinkType.PROJECT,
      };

      mockNotesService.findAll.mockResolvedValue([mockNote]);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters, undefined);
      expect(result).toEqual([mockNote]);
    });
  });

  describe('findOne', () => {
    it('should return a note by id', async () => {
      mockNotesService.findOne.mockResolvedValue(mockNote);

      const result = await controller.findOne('note-123');

      expect(service.findOne).toHaveBeenCalledWith('note-123', undefined);
      expect(result).toEqual(mockNote);
    });

    it('should throw NotFoundException when note not found', async () => {
      mockNotesService.findOne.mockRejectedValue(
        new NotFoundException('Note with ID note-999 not found'),
      );

      await expect(controller.findOne('note-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a note successfully', async () => {
      const updateDto: UpdateNoteDto = {
        subject: 'Updated Note Subject',
        isRead: true,
      };

      const updatedNote = { ...mockNote, ...updateDto };
      mockNotesService.update.mockResolvedValue(updatedNote);

      const result = await controller.update('note-123', updateDto);

      expect(service.update).toHaveBeenCalledWith('note-123', updateDto, undefined);
      expect(result).toEqual(updatedNote);
    });
  });

  describe('remove', () => {
    it('should delete a note successfully', async () => {
      mockNotesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('note-123');

      expect(service.remove).toHaveBeenCalledWith('note-123', undefined);
      expect(result).toEqual({ message: 'Nota eliminada exitosamente' });
    });
  });
});
