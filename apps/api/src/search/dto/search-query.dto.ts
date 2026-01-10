import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchEntity {
  ALL = 'all',
  PROJECT = 'project',
  EPISODE = 'episode',
  SEQUENCE = 'sequence',
  SHOT = 'shot',
  ASSET = 'asset',
  NOTE = 'note',
}

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search query string',
    example: 'animation character',
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: 'Entity type to search in',
    enum: SearchEntity,
    default: SearchEntity.ALL,
    example: SearchEntity.PROJECT,
  })
  @IsOptional()
  @IsEnum(SearchEntity)
  entity?: SearchEntity = SearchEntity.ALL;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
