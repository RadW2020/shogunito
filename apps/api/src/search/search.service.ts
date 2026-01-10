import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchQueryDto, SearchEntity } from './dto/search-query.dto';
import { Project, Episode, Sequence, Asset, Note } from '../entities';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/pagination.dto';
import { UserContext, ProjectAccessService } from '../auth/services';

export interface SearchResult {
  entity: string; // 'project', 'episode', etc.
  id: string;
  code?: string;
  name?: string;
  title?: string;
  description?: string;
  content?: string;
  subject?: string;
  rank: number; // Search relevance score
  highlightedText?: string; // Matched text snippet
}

interface RawSearchResult {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  rank: string | number;
  highlightedText?: string;
}

interface RawNoteSearchResult {
  id: string;
  subject?: string;
  content?: string;
  rank: string | number;
  highlightedText?: string;
}

/**
 * Search Service
 *
 * Implements full-text search across multiple entities using PostgreSQL's
 * built-in text search capabilities (tsvector, tsquery).
 *
 * Features:
 * - Search across: projects, episodes, sequences, assets, notes
 * - Relevance ranking (ts_rank)
 * - Highlighted snippets (ts_headline)
 * - Case-insensitive
 * - Stemming (english language)
 * - Pagination
 *
 * @example
 * const results = await searchService.search({
 *   q: 'animation character',
 *   entity: SearchEntity.PROJECT,
 *   page: 1,
 *   limit: 20,
 * });
 */
@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Episode)
    private episodeRepository: Repository<Episode>,
    @InjectRepository(Sequence)
    private sequenceRepository: Repository<Sequence>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(Note)
    private noteRepository: Repository<Note>,
    private projectAccessService: ProjectAccessService,
  ) {}

  /**
   * Main search method
   */
  async search(
    dto: SearchQueryDto,
    userContext?: UserContext,
  ): Promise<PaginatedResponse<SearchResult>> {
    const { q, entity, page, limit } = dto;

    // Sanitize search query for tsquery
    const sanitizedQuery = this.sanitizeSearchQuery(q);

    switch (entity) {
      case SearchEntity.PROJECT:
        return this.searchProjects(sanitizedQuery, page, limit, userContext);
      case SearchEntity.EPISODE:
        return this.searchEpisodes(sanitizedQuery, page, limit, userContext);
      case SearchEntity.SEQUENCE:
        return this.searchSequences(sanitizedQuery, page, limit, userContext);
      case SearchEntity.ASSET:
        return this.searchAssets(sanitizedQuery, page, limit, userContext);
      case SearchEntity.NOTE:
        return this.searchNotes(sanitizedQuery, page, limit, userContext);
      case SearchEntity.ALL:
      default:
        return this.searchAll(sanitizedQuery, page, limit, userContext);
    }
  }

  /**
   * Search in Projects
   */
  private async searchProjects(
    query: string,
    page: number,
    limit: number,
    userContext?: UserContext,
  ): Promise<PaginatedResponse<SearchResult>> {
    const offset = (page - 1) * limit;

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .select('project.id', 'id')
      .addSelect('project.code', 'code')
      .addSelect('project.name', 'name')
      .addSelect('project.description', 'description')
      .addSelect(
        `ts_rank(
          to_tsvector('english', coalesce(project.name, '') || ' ' || coalesce(project.description, '') || ' ' || coalesce(project.code, '')),
          plainto_tsquery('english', :query)
        )`,
        'rank',
      )
      .addSelect(
        "ts_headline('english', coalesce(project.description, project.name), plainto_tsquery('english', :query), 'MaxWords=30, MinWords=10')",
        'highlightedText',
      )
      .where(
        "to_tsvector('english', coalesce(project.name, '') || ' ' || coalesce(project.description, '') || ' ' || coalesce(project.code, '')) @@ plainto_tsquery('english', :query)",
      )
      .setParameter('query', query);

    // Filter by user's accessible projects (unless admin)
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds =
        await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return createPaginatedResponse([], 0, page, limit);
      }
      queryBuilder.andWhere('project.id IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    queryBuilder.orderBy('rank', 'DESC').offset(offset).limit(limit);

    const results = (await queryBuilder.getRawMany()) as unknown as RawSearchResult[];

    // Get total count
    const countQuery = this.projectRepository
      .createQueryBuilder('project')
      .where(
        "to_tsvector('english', coalesce(project.name, '') || ' ' || coalesce(project.description, '') || ' ' || coalesce(project.code, '')) @@ plainto_tsquery('english', :query)",
      )
      .setParameter('query', query);

    // Apply same project filter to count query
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds =
        await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return createPaginatedResponse([], 0, page, limit);
      }
      countQuery.andWhere('project.id IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    const total = await countQuery.getCount();

    const searchResults: SearchResult[] = results.map((r) => ({
      entity: 'project',
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      rank: parseFloat(String(r.rank)),
      highlightedText: r.highlightedText,
    }));

    return createPaginatedResponse(searchResults, total, page, limit);
  }

  /**
   * Search in Episodes
   */
  private async searchEpisodes(
    query: string,
    page: number,
    limit: number,
    userContext?: UserContext,
  ): Promise<PaginatedResponse<SearchResult>> {
    const offset = (page - 1) * limit;

    const queryBuilder = this.episodeRepository
      .createQueryBuilder('episode')
      .select('episode.id', 'id')
      .addSelect('episode.code', 'code')
      .addSelect('episode.name', 'name')
      .addSelect('episode.description', 'description')
      .addSelect(
        `ts_rank(
          to_tsvector('english', coalesce(episode.name, '') || ' ' || coalesce(episode.description, '') || ' ' || coalesce(episode.code, '')),
          plainto_tsquery('english', :query)
        )`,
        'rank',
      )
      .addSelect(
        "ts_headline('english', coalesce(episode.description, episode.name), plainto_tsquery('english', :query))",
        'highlightedText',
      )
      .where(
        "to_tsvector('english', coalesce(episode.name, '') || ' ' || coalesce(episode.description, '') || ' ' || coalesce(episode.code, '')) @@ plainto_tsquery('english', :query)",
      )
      .setParameter('query', query);

    // Filter by user's accessible projects (unless admin)
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds =
        await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return createPaginatedResponse([], 0, page, limit);
      }
      queryBuilder.andWhere('episode.projectId IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    queryBuilder.orderBy('rank', 'DESC').offset(offset).limit(limit);

    const results = (await queryBuilder.getRawMany()) as unknown as RawSearchResult[];

    const countQuery = this.episodeRepository
      .createQueryBuilder('episode')
      .where(
        "to_tsvector('english', coalesce(episode.name, '') || ' ' || coalesce(episode.description, '') || ' ' || coalesce(episode.code, '')) @@ plainto_tsquery('english', :query)",
      )
      .setParameter('query', query);

    // Apply same project filter to count query
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds =
        await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return createPaginatedResponse([], 0, page, limit);
      }
      countQuery.andWhere('episode.projectId IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    const total = await countQuery.getCount();

    const searchResults: SearchResult[] = results.map((r) => ({
      entity: 'episode',
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      rank: parseFloat(String(r.rank)),
      highlightedText: r.highlightedText,
    }));

    return createPaginatedResponse(searchResults, total, page, limit);
  }

  /**
   * Search in Sequences
   */
  private async searchSequences(
    query: string,
    page: number,
    limit: number,
    userContext?: UserContext,
  ): Promise<PaginatedResponse<SearchResult>> {
    const offset = (page - 1) * limit;

    const queryBuilder = this.sequenceRepository
      .createQueryBuilder('sequence')
      .leftJoin('sequence.episode', 'episode')
      .select('sequence.id', 'id')
      .addSelect('sequence.code', 'code')
      .addSelect('sequence.name', 'name')
      .addSelect('sequence.description', 'description')
      .addSelect(
        `ts_rank(
          to_tsvector('english', coalesce(sequence.name, '') || ' ' || coalesce(sequence.description, '') || ' ' || coalesce(sequence.code, '')),
          plainto_tsquery('english', :query)
        )`,
        'rank',
      )
      .addSelect(
        "ts_headline('english', coalesce(sequence.description, sequence.name), plainto_tsquery('english', :query))",
        'highlightedText',
      )
      .where(
        "to_tsvector('english', coalesce(sequence.name, '') || ' ' || coalesce(sequence.description, '') || ' ' || coalesce(sequence.code, '')) @@ plainto_tsquery('english', :query)",
      )
      .setParameter('query', query);

    // Filter by user's accessible projects (unless admin)
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds =
        await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return createPaginatedResponse([], 0, page, limit);
      }
      queryBuilder.andWhere('episode.projectId IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    queryBuilder.orderBy('rank', 'DESC').offset(offset).limit(limit);

    const results = (await queryBuilder.getRawMany()) as unknown as RawSearchResult[];

    const countQuery = this.sequenceRepository
      .createQueryBuilder('sequence')
      .leftJoin('sequence.episode', 'episode')
      .where(
        "to_tsvector('english', coalesce(sequence.name, '') || ' ' || coalesce(sequence.description, '') || ' ' || coalesce(sequence.code, '')) @@ plainto_tsquery('english', :query)",
      )
      .setParameter('query', query);

    // Apply same project filter to count query
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds =
        await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return createPaginatedResponse([], 0, page, limit);
      }
      countQuery.andWhere('episode.projectId IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    const total = await countQuery.getCount();

    const searchResults: SearchResult[] = results.map((r) => ({
      entity: 'sequence',
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      rank: parseFloat(String(r.rank)),
      highlightedText: r.highlightedText,
    }));

    return createPaginatedResponse(searchResults, total, page, limit);
  }

  /**
   * Search in Assets
   */
  private async searchAssets(
    query: string,
    page: number,
    limit: number,
    userContext?: UserContext,
  ): Promise<PaginatedResponse<SearchResult>> {
    const offset = (page - 1) * limit;

    const queryBuilder = this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.id', 'id')
      .addSelect('asset.code', 'code')
      .addSelect('asset.name', 'name')
      .addSelect('asset.description', 'description')
      .addSelect(
        `ts_rank(
          to_tsvector('english', coalesce(asset.name, '') || ' ' || coalesce(asset.description, '') || ' ' || coalesce(asset.code, '')),
          plainto_tsquery('english', :query)
        )`,
        'rank',
      )
      .addSelect(
        "ts_headline('english', coalesce(asset.description, asset.name), plainto_tsquery('english', :query))",
        'highlightedText',
      )
      .where(
        "to_tsvector('english', coalesce(asset.name, '') || ' ' || coalesce(asset.description, '') || ' ' || coalesce(asset.code, '')) @@ plainto_tsquery('english', :query)",
      )
      .setParameter('query', query);

    // Filter by user's accessible projects (unless admin)
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds =
        await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return createPaginatedResponse([], 0, page, limit);
      }
      queryBuilder.andWhere('asset.projectId IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    queryBuilder.orderBy('rank', 'DESC').offset(offset).limit(limit);

    const results = (await queryBuilder.getRawMany()) as unknown as RawSearchResult[];

    const countQuery = this.assetRepository
      .createQueryBuilder('asset')
      .where(
        "to_tsvector('english', coalesce(asset.name, '') || ' ' || coalesce(asset.description, '') || ' ' || coalesce(asset.code, '')) @@ plainto_tsquery('english', :query)",
      )
      .setParameter('query', query);

    // Apply same project filter to count query
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds =
        await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return createPaginatedResponse([], 0, page, limit);
      }
      countQuery.andWhere('asset.projectId IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    const total = await countQuery.getCount();

    const searchResults: SearchResult[] = results.map((r) => ({
      entity: 'asset',
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      rank: parseFloat(String(r.rank)),
      highlightedText: r.highlightedText,
    }));

    return createPaginatedResponse(searchResults, total, page, limit);
  }

  /**
   * Search in Notes
   * Note: Notes are linked to entities, so we need to filter by checking the linked entity's project
   */
  private async searchNotes(
    query: string,
    page: number,
    limit: number,
    userContext?: UserContext,
  ): Promise<PaginatedResponse<SearchResult>> {
    const offset = (page - 1) * limit;

    // For notes, we need to search first, then filter by project access
    // This is because notes are linked to entities via linkType and linkId
    const queryBuilder = this.noteRepository
      .createQueryBuilder('note')
      .select('note.id', 'id')
      .addSelect('note.subject', 'subject')
      .addSelect('note.content', 'content')
      .addSelect('note.linkType', 'linkType')
      .addSelect('note.linkId', 'linkId')
      .addSelect(
        `ts_rank(
          to_tsvector('english', coalesce(note.subject, '') || ' ' || coalesce(note.content, '')),
          plainto_tsquery('english', :query)
        )`,
        'rank',
      )
      .addSelect(
        "ts_headline('english', coalesce(note.content, note.subject), plainto_tsquery('english', :query))",
        'highlightedText',
      )
      .where(
        "to_tsvector('english', coalesce(note.subject, '') || ' ' || coalesce(note.content, '')) @@ plainto_tsquery('english', :query)",
      )
      .setParameter('query', query)
      .orderBy('rank', 'DESC')
      .offset(offset)
      .limit(limit * 2); // Get more results to account for filtering

    const allResults = (await queryBuilder.getRawMany()) as unknown as (RawNoteSearchResult & {
      linkType: string;
      linkId: string;
    })[];

    // Filter notes by project access
    let filteredResults = allResults;
    if (userContext && !this.projectAccessService.isAdmin(userContext)) {
      const accessibleProjectIds =
        await this.projectAccessService.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        return createPaginatedResponse([], 0, page, limit);
      }

      // Check each note's linked entity for project access
      filteredResults = [];
      for (const note of allResults) {
        try {
          const projectId = await this.projectAccessService.getProjectIdFromVersion({
            entityId: parseInt(note.linkId, 10),
            entityType: note.linkType,
          });
          if (projectId && accessibleProjectIds.includes(projectId)) {
            filteredResults.push(note);
          }
        } catch {
          // Skip notes where we can't determine project access
          continue;
        }
      }
    }

    // Apply pagination after filtering
    const paginatedResults = filteredResults.slice(offset, offset + limit);
    const total = filteredResults.length;

    const searchResults: SearchResult[] = paginatedResults.map((r) => ({
      entity: 'note',
      id: r.id,
      subject: r.subject,
      content: r.content,
      rank: parseFloat(String(r.rank)),
      highlightedText: r.highlightedText,
    }));

    return createPaginatedResponse(searchResults, total, page, limit);
  }

  /**
   * Search across all entities
   */
  private async searchAll(
    query: string,
    page: number,
    limit: number,
    userContext?: UserContext,
  ): Promise<PaginatedResponse<SearchResult>> {
    // Search in parallel across all entities
    const [projects, episodes, sequences, assets, notes] = await Promise.all([
      this.searchProjects(query, 1, 100, userContext),
      this.searchEpisodes(query, 1, 100, userContext),
      this.searchSequences(query, 1, 100, userContext),
      this.searchAssets(query, 1, 100, userContext),
      this.searchNotes(query, 1, 100, userContext),
    ]);

    // Combine all results
    const allResults: SearchResult[] = [
      ...projects.data,
      ...episodes.data,
      ...sequences.data,
      ...assets.data,
      ...notes.data,
    ];

    // Sort by rank
    allResults.sort((a, b) => b.rank - a.rank);

    // Calculate total
    const total =
      projects.pagination.total +
      episodes.pagination.total +
      sequences.pagination.total +
      assets.pagination.total +
      notes.pagination.total;

    // Paginate combined results
    const offset = (page - 1) * limit;
    const paginatedResults = allResults.slice(offset, offset + limit);

    return createPaginatedResponse(paginatedResults, total, page, limit);
  }

  /**
   * Sanitize search query for PostgreSQL tsquery
   * Removes special characters that could break tsquery syntax
   */
  private sanitizeSearchQuery(query: string): string {
    // Remove special characters except spaces and alphanumeric
    return query
      .replace(/[^\w\s]/gi, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }
}
