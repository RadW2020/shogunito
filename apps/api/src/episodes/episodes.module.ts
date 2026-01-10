import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpisodesService } from './episodes.service';
import { EpisodesController } from './episodes.controller';
import { Episode, Project, Sequence, Status } from '../entities';
import { ProjectAccessModule } from '../auth/services/project-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Episode, Project, Sequence, Status]),
    ProjectAccessModule,
  ],
  controllers: [EpisodesController],
  providers: [EpisodesService],
  exports: [EpisodesService],
})
export class EpisodesModule {}
