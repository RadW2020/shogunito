import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShotsService } from './shots.service';
import { ShotsController } from './shots.controller';
import { Shot, Sequence, Version, Status } from '../entities';
import { ProjectAccessModule } from '../auth/services/project-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shot, Sequence, Version, Status]),
    ProjectAccessModule,
  ],
  controllers: [ShotsController],
  providers: [ShotsService],
  exports: [ShotsService],
})
export class ShotsModule {}
