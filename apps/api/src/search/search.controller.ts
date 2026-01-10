import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService, SearchResult } from './search.service';
import { SearchQueryDto, SearchEntity } from './dto/search-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions, Permission } from '../auth/decorators/permissions.decorator';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserContext } from '../auth/services/project-access.service';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequirePermissions(Permission.PROJECT_READ) // At minimum, users need read permission
  @ApiOperation({
    summary: 'Full-text search across entities',
    description: `
    Perform full-text search across multiple entity types using PostgreSQL's
    built-in text search capabilities.

    **Searchable Entities:**
    - Projects (name, description, code)
    - Episodes (name, description, code)
    - Sequences (name, description, code)
    - Assets (name, description, code)
    - Notes (subject, content)

    **Features:**
    - Case-insensitive search
    - Stemming (finds variations: run, running, runs)
    - Relevance ranking (ts_rank)
    - Highlighted snippets (ts_headline)
    - Pagination support
    - Multi-entity or single-entity search

    **Examples:**
    - \`GET /search?q=animation\` - Search all entities
    - \`GET /search?q=character&entity=project\` - Search only projects
    `,
  })
  @ApiQuery({
    name: 'q',
    description: 'Search query string',
    example: 'animation character',
    required: true,
  })
  @ApiQuery({
    name: 'entity',
    description: 'Entity type to search in (all, project, episode, sequence, asset, note)',
    enum: SearchEntity,
    required: false,
    example: SearchEntity.ALL,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of results per page (max 100)',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results with relevance ranking and pagination',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entity: {
                type: 'string',
                enum: ['project', 'episode', 'sequence', 'asset', 'note'],
                example: 'project',
              },
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000',
              },
              code: {
                type: 'string',
                example: 'PRJ_001',
              },
              name: {
                type: 'string',
                example: 'Animation Project',
              },
              description: {
                type: 'string',
                example: 'A project about character animation',
              },
              rank: {
                type: 'number',
                description: 'Relevance score (higher = more relevant)',
                example: 0.98765,
              },
              highlightedText: {
                type: 'string',
                description: 'Text snippet with matched terms highlighted',
                example: 'A project about <b>character</b> <b>animation</b>',
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 45 },
            totalPages: { type: 'number', example: 3 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async search(
    @Query() searchQueryDto: SearchQueryDto,
    @CurrentUser() currentUser?: User,
  ): Promise<PaginatedResponse<SearchResult>> {
    const userContext: UserContext | undefined = currentUser
      ? { userId: currentUser.id, role: currentUser.role }
      : undefined;
    return this.searchService.search(searchQueryDto, userContext);
  }
}
