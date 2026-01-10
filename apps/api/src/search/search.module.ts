import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ProjectAccessModule } from '../auth/services/project-access.module';
import { Project } from '../entities/project.entity';
import { Episode } from '../entities/episode.entity';
import { Sequence } from '../entities/sequence.entity';
import { Asset } from '../entities/asset.entity';
import { Note } from '../entities/note.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Episode, Sequence, Asset, Note]),
    ProjectAccessModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
