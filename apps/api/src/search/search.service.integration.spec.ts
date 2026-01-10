import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { Project, Episode, Sequence, Shot, Asset, Note } from '../entities';
import { SearchQueryDto, SearchEntity } from './dto/search-query.dto';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';

/**
 * Integration tests for SearchService
 *
 * Tests full-text search flows with:
 * - Search across different entities
 * - Access control filtering
 * - Pagination
 * - Query sanitization
 */
describe('SearchService Integration Tests', () => {
  let module: TestingModule;
  let searchService: SearchService;
  let projectRepository: jest.Mocked<any>;
  let episodeRepository: jest.Mocked<any>;
  let sequenceRepository: jest.Mocked<any>;
  let shotRepository: jest.Mocked<any>;
  let assetRepository: jest.Mocked<any>;
  let noteRepository: jest.Mocked<any>;
  let projectAccessService: jest.Mocked<ProjectAccessService>;

  const mockUserContext: UserContext = {
    userId: 1,
    role: 'member',
  };

  const mockAdminContext: UserContext = {
    userId: 2,
    role: 'admin',
  };

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            createQueryBuilder: jest.fn(() => {
              const qb = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                offset: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
                getCount: jest.fn().mockResolvedValue(0),
              };
              return qb;
            }),
          },
        },
        {
          provide: getRepositoryToken(Episode),
          useValue: {
            createQueryBuilder: jest.fn(() => {
              const qb = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                offset: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
                getCount: jest.fn().mockResolvedValue(0),
              };
              return qb;
            }),
          },
        },
        {
          provide: getRepositoryToken(Sequence),
          useValue: {
            createQueryBuilder: jest.fn(() => {
              const qb = {
                leftJoin: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                offset: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
                getRawMany: jest.fn().mockResolvedValue([]),
                getCount: jest.fn().mockResolvedValue(0),
              };
              return qb;
            }),
          },
        },
        {
          provide: getRepositoryToken(Shot),
          useValue: {
            createQueryBuilder: jest.fn(() => {
              const qb = {
                leftJoin: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                offset: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
                getCount: jest.fn().mockResolvedValue(0),
              };
              return qb;
            }),
          },
        },
        {
          provide: getRepositoryToken(Asset),
          useValue: {
            createQueryBuilder: jest.fn(() => {
              const qb = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                offset: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
                getCount: jest.fn().mockResolvedValue(0),
              };
              return qb;
            }),
          },
        },
        {
          provide: getRepositoryToken(Note),
          useValue: {
            createQueryBuilder: jest.fn(() => {
              const qb = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                offset: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
              };
              return qb;
            }),
          },
        },
        {
          provide: ProjectAccessService,
          useValue: {
            isAdmin: jest.fn(),
            getAccessibleProjectIds: jest.fn(),
            getProjectIdFromVersion: jest.fn(),
          },
        },
      ],
    }).compile();

    searchService = testModule.get<SearchService>(SearchService);
    projectRepository = testModule.get(getRepositoryToken(Project));
    episodeRepository = testModule.get(getRepositoryToken(Episode));
    sequenceRepository = testModule.get(getRepositoryToken(Sequence));
    shotRepository = testModule.get(getRepositoryToken(Shot));
    assetRepository = testModule.get(getRepositoryToken(Asset));
    noteRepository = testModule.get(getRepositoryToken(Note));
    projectAccessService = testModule.get<ProjectAccessService>(ProjectAccessService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Search Projects', () => {
    it('should search projects without user context', async () => {
      const queryBuilder = projectRepository.createQueryBuilder();
      queryBuilder.getRawMany = jest.fn().mockResolvedValue([
        { id: '1', code: 'PRJ_001', name: 'Project 1', description: 'Test', rank: 0.5 },
      ]);
      queryBuilder.getCount = jest.fn().mockResolvedValue(1);

      const searchDto: SearchQueryDto = {
        q: 'test',
        entity: SearchEntity.PROJECT,
        page: 1,
        limit: 20,
      };

      const result = await searchService.search(searchDto);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter projects by accessible project IDs for non-admin', async () => {
      const mockAndWhere = jest.fn().mockReturnThis();
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: mockAndWhere,
        setParameter: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
      };
      projectRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.isAdmin.mockReturnValue(false);
      projectAccessService.getAccessibleProjectIds.mockResolvedValue([123]);

      const searchDto: SearchQueryDto = {
        q: 'test',
        entity: SearchEntity.PROJECT,
        page: 1,
        limit: 20,
      };

      const result = await searchService.search(searchDto, mockUserContext);

      expect(mockAndWhere).toHaveBeenCalled();
      expect(projectAccessService.getAccessibleProjectIds).toHaveBeenCalled();
    });

    it('should return empty results when user has no accessible projects', async () => {
      const queryBuilder = projectRepository.createQueryBuilder();
      projectAccessService.isAdmin.mockReturnValue(false);
      projectAccessService.getAccessibleProjectIds.mockResolvedValue([]);

      const searchDto: SearchQueryDto = {
        q: 'test',
        entity: SearchEntity.PROJECT,
        page: 1,
        limit: 20,
      };

      const result = await searchService.search(searchDto, mockUserContext);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should not filter projects for admin users', async () => {
      const queryBuilder = projectRepository.createQueryBuilder();
      queryBuilder.getRawMany = jest.fn().mockResolvedValue([]);
      queryBuilder.getCount = jest.fn().mockResolvedValue(0);
      projectAccessService.isAdmin.mockReturnValue(true);

      const searchDto: SearchQueryDto = {
        q: 'test',
        entity: SearchEntity.PROJECT,
        page: 1,
        limit: 20,
      };

      await searchService.search(searchDto, mockAdminContext);

      expect(projectAccessService.getAccessibleProjectIds).not.toHaveBeenCalled();
    });
  });

  describe('Search Episodes', () => {
    it('should search episodes', async () => {
      const queryBuilder = episodeRepository.createQueryBuilder();
      queryBuilder.getRawMany = jest.fn().mockResolvedValue([]);
      queryBuilder.getCount = jest.fn().mockResolvedValue(0);
      projectAccessService.isAdmin.mockReturnValue(true);

      const searchDto: SearchQueryDto = {
        q: 'episode',
        entity: SearchEntity.EPISODE,
        page: 1,
        limit: 20,
      };

      const result = await searchService.search(searchDto, mockAdminContext);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Search Sequences', () => {
    it('should search sequences', async () => {
      const queryBuilder = sequenceRepository.createQueryBuilder();
      queryBuilder.getRawMany = jest.fn().mockResolvedValue([]);
      queryBuilder.getCount = jest.fn().mockResolvedValue(0);
      projectAccessService.isAdmin.mockReturnValue(true);

      const searchDto: SearchQueryDto = {
        q: 'sequence',
        entity: SearchEntity.SEQUENCE,
        page: 1,
        limit: 20,
      };

      const result = await searchService.search(searchDto, mockAdminContext);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Search Shots', () => {
    it('should search shots', async () => {
      const queryBuilder = shotRepository.createQueryBuilder();
      queryBuilder.getRawMany = jest.fn().mockResolvedValue([]);
      queryBuilder.getCount = jest.fn().mockResolvedValue(0);
      projectAccessService.isAdmin.mockReturnValue(true);

      const searchDto: SearchQueryDto = {
        q: 'shot',
        entity: SearchEntity.SHOT,
        page: 1,
        limit: 20,
      };

      const result = await searchService.search(searchDto, mockAdminContext);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Search Assets', () => {
    it('should search assets', async () => {
      const queryBuilder = assetRepository.createQueryBuilder();
      queryBuilder.getRawMany = jest.fn().mockResolvedValue([]);
      queryBuilder.getCount = jest.fn().mockResolvedValue(0);
      projectAccessService.isAdmin.mockReturnValue(true);

      const searchDto: SearchQueryDto = {
        q: 'asset',
        entity: SearchEntity.ASSET,
        page: 1,
        limit: 20,
      };

      const result = await searchService.search(searchDto, mockAdminContext);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Search Notes', () => {
    it('should search notes', async () => {
      const queryBuilder = noteRepository.createQueryBuilder();
      queryBuilder.getRawMany = jest.fn().mockResolvedValue([]);
      projectAccessService.isAdmin.mockReturnValue(true);

      const searchDto: SearchQueryDto = {
        q: 'note',
        entity: SearchEntity.NOTE,
        page: 1,
        limit: 20,
      };

      const result = await searchService.search(searchDto, mockAdminContext);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Search All', () => {
    it('should search across all entities', async () => {
      const projectQb = projectRepository.createQueryBuilder();
      projectQb.getRawMany = jest.fn().mockResolvedValue([]);
      projectQb.getCount = jest.fn().mockResolvedValue(0);

      const episodeQb = episodeRepository.createQueryBuilder();
      episodeQb.getRawMany = jest.fn().mockResolvedValue([]);
      episodeQb.getCount = jest.fn().mockResolvedValue(0);

      const sequenceQb = sequenceRepository.createQueryBuilder();
      sequenceQb.getRawMany = jest.fn().mockResolvedValue([]);
      sequenceQb.getCount = jest.fn().mockResolvedValue(0);

      const shotQb = shotRepository.createQueryBuilder();
      shotQb.getRawMany = jest.fn().mockResolvedValue([]);
      shotQb.getCount = jest.fn().mockResolvedValue(0);

      const assetQb = assetRepository.createQueryBuilder();
      assetQb.getRawMany = jest.fn().mockResolvedValue([]);
      assetQb.getCount = jest.fn().mockResolvedValue(0);

      const noteQb = noteRepository.createQueryBuilder();
      noteQb.getRawMany = jest.fn().mockResolvedValue([]);

      projectAccessService.isAdmin.mockReturnValue(true);

      const searchDto: SearchQueryDto = {
        q: 'test',
        entity: SearchEntity.ALL,
        page: 1,
        limit: 20,
      };

      const result = await searchService.search(searchDto, mockAdminContext);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Query Sanitization', () => {
    it('should sanitize search query', async () => {
      const mockSetParameter = jest.fn().mockReturnThis();
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameter: mockSetParameter,
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
      };
      projectRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const searchDto: SearchQueryDto = {
        q: 'test@#$%^&*()query',
        entity: SearchEntity.PROJECT,
        page: 1,
        limit: 20,
      };

      await searchService.search(searchDto);

      expect(mockSetParameter).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('should support pagination', async () => {
      const mockOffset = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: mockOffset,
        limit: mockLimit,
        getRawMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
      };
      projectRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const searchDto: SearchQueryDto = {
        q: 'test',
        entity: SearchEntity.PROJECT,
        page: 2,
        limit: 10,
      };

      const result = await searchService.search(searchDto);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(mockOffset).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalled();
    });
  });
});

