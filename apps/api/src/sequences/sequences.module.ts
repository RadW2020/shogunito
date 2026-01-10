import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SequencesService } from './sequences.service';
import { SequencesController } from './sequences.controller';
import { Sequence, Episode, Version, Status } from '../entities';
import { EpisodesModule } from '../episodes/episodes.module';
import { ProjectAccessModule } from '../auth/services/project-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sequence, Episode, Version, Status]),
    forwardRef(() => EpisodesModule),
    ProjectAccessModule,
  ],
  controllers: [SequencesController],
  providers: [SequencesService],
  exports: [SequencesService],
})
export class SequencesModule {}
