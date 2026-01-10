import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchQueryDto, SearchEntity } from './dto/search-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';

describe('SearchController', () => {
  let controller: SearchController;
  let service: SearchService;

  const mockSearchResult = {
    entity: 'project',
    id: 'project-123',
    code: 'PROJ_001',
    name: 'Test Project',
    rank: 0.5,
  };

  const mockPaginatedResponse = {
    data: [mockSearchResult],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    },
  };

  const mockSearchService = {
    search: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
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

    controller = module.get<SearchController>(SearchController);
    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should return search results for all entities', async () => {
      const query: SearchQueryDto = {
        q: 'test',
        entity: SearchEntity.ALL,
        page: 1,
        limit: 20,
      };

      mockSearchService.search.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.search(query);

      expect(service.search).toHaveBeenCalledWith(query, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return search results for specific entity', async () => {
      const query: SearchQueryDto = {
        q: 'animation',
        entity: SearchEntity.PROJECT,
        page: 1,
        limit: 20,
      };

      mockSearchService.search.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.search(query);

      expect(service.search).toHaveBeenCalledWith(query, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle pagination parameters', async () => {
      const query: SearchQueryDto = {
        q: 'test',
        entity: SearchEntity.ALL,
        page: 2,
        limit: 10,
      };

      mockSearchService.search.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.search(query);

      expect(service.search).toHaveBeenCalledWith(query, undefined);
      expect(result).toBeDefined();
    });
  });
});
