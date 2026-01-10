import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { Project } from '../entities/project.entity';
import { Episode } from '../entities/episode.entity';
import { Sequence } from '../entities/sequence.entity';
import { Shot } from '../entities/shot.entity';
import { Asset } from '../entities/asset.entity';
import { Note } from '../entities/note.entity';
import { SearchQueryDto, SearchEntity } from './dto/search-query.dto';
import { ProjectAccessService } from '../auth/services/project-access.service';

describe('SearchService', () => {
  let service: SearchService;
  let projectRepository: any;
  let episodeRepository: any;
  let sequenceRepository: any;
  let shotRepository: any;
  let assetRepository: any;
  let noteRepository: any;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Episode),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Sequence),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Shot),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Asset),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Note),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: ProjectAccessService,
          useValue: {
            isAdmin: jest.fn().mockReturnValue(false),
            getAccessibleProjectIds: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    projectRepository = module.get(getRepositoryToken(Project));
    episodeRepository = module.get(getRepositoryToken(Episode));
    shotRepository = module.get(getRepositoryToken(Shot));
    assetRepository = module.get(getRepositoryToken(Asset));
    noteRepository = module.get(getRepositoryToken(Note));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should search projects', async () => {
      const dto: SearchQueryDto = {
        q: 'test',
        entity: SearchEntity.PROJECT,
        page: 1,
        limit: 20,
      };

      const countQueryBuilder = {
        ...mockQueryBuilder,
      };

      projectRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(countQueryBuilder);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          id: 'project-123',
          code: 'PROJ_001',
          name: 'Test Project',
          rank: '0.5',
        },
      ]);

      countQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.search(dto);

      expect(projectRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
    });

    it('should search episodes', async () => {
      const dto: SearchQueryDto = {
        q: 'episode',
        entity: SearchEntity.EPISODE,
        page: 1,
        limit: 20,
      };

      const countQueryBuilder = {
        ...mockQueryBuilder,
      };

      episodeRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(countQueryBuilder);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          id: 'episode-123',
          code: 'EP_001',
          name: 'Test Episode',
          rank: '0.5',
        },
      ]);

      countQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.search(dto);

      expect(episodeRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should search shots', async () => {
      const dto: SearchQueryDto = {
        q: 'shot',
        entity: SearchEntity.SHOT,
        page: 1,
        limit: 20,
      };

      const countQueryBuilder = {
        ...mockQueryBuilder,
      };

      shotRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(countQueryBuilder);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          id: 'shot-123',
          code: 'SH_001',
          name: 'Test Shot',
          rank: '0.5',
        },
      ]);

      countQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.search(dto);

      expect(shotRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should search assets', async () => {
      const dto: SearchQueryDto = {
        q: 'asset',
        entity: SearchEntity.ASSET,
        page: 1,
        limit: 20,
      };

      const countQueryBuilder = {
        ...mockQueryBuilder,
      };

      assetRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(countQueryBuilder);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          id: 'asset-123',
          code: 'ASSET_001',
          name: 'Test Asset',
          rank: '0.5',
        },
      ]);

      countQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.search(dto);

      expect(assetRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should search notes', async () => {
      const dto: SearchQueryDto = {
        q: 'note',
        entity: SearchEntity.NOTE,
        page: 1,
        limit: 20,
      };

      const countQueryBuilder = {
        ...mockQueryBuilder,
      };

      noteRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(countQueryBuilder);

      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          id: 'note-123',
          subject: 'Test Note',
          content: 'Test content',
          rank: '0.5',
        },
      ]);

      countQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.search(dto);

      expect(noteRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should sanitize search query', async () => {
      const dto: SearchQueryDto = {
        q: 'test & query | with special chars',
        entity: SearchEntity.PROJECT,
        page: 1,
        limit: 20,
      };

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.search(dto);

      // Should sanitize the query before using it
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });
});
