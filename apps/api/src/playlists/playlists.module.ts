import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistsService } from './playlists.service';
import { PlaylistsController } from './playlists.controller';
import { Playlist, Project, Version, Status } from '../entities';
import { ProjectAccessModule } from '../auth/services/project-access.module';

@Module({
  imports: [TypeOrmModule.forFeature([Playlist, Project, Version, Status]), ProjectAccessModule],
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}
