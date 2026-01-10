import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { Note } from '../entities/note.entity';
import { Project } from '../entities/project.entity';
import { Episode } from '../entities/episode.entity';
import { Sequence } from '../entities/sequence.entity';
import { Version } from '../entities/version.entity';
import { Asset } from '../entities/asset.entity';
import { Playlist } from '../entities/playlist.entity';
import { FilesModule } from '../files/files.module';
import { ProjectAccessModule } from '../auth/services/project-access.module';

@Module({
  imports: [
    FilesModule,
    ProjectAccessModule,
  ],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
