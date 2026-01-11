import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  Project,
  Episode,
  Sequence,
  Version,
  Asset,
  User,
  Status,
  Note,
  ProjectPermission,
} from './entities';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { EpisodesModule } from './episodes/episodes.module';

import { SequencesModule } from './sequences/sequences.module';
import { VersionsModule } from './versions/versions.module';
import { UsersModule } from './users/users.module';
import { StatusesModule } from './statuses/statuses.module';
import { AssetsModule } from './assets/assets.module';

import { NotesModule } from './notes/notes.module';
import { FilesModule } from './files/files.module';
import { SearchModule } from './search/search.module';

import { HealthModule } from './health/health.module';
import { ProjectPermissionsModule } from './project-permissions/project-permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load .env.production when NODE_ENV=production
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USERNAME || 'dev',
      password: process.env.DATABASE_PASSWORD || 'dev',
      database: process.env.DATABASE_NAME || 'shogun',
      entities: [
        Project,
        Episode,
        Sequence,

        Version,
        Asset,
        User,
        Status,

        Note,
        RefreshToken,
        ProjectPermission,
      ],
      // CRITICAL: synchronize must be false in production
      // In test environment, use synchronize to auto-create tables from entities
      synchronize: process.env.NODE_ENV === 'test',
      // IMPORTANT: Don't drop schema in test - it can cause race conditions
      // Instead, rely on synchronize to update schema, or use migrations
      dropSchema: false, // Changed from process.env.NODE_ENV === 'test' to prevent race conditions
      // Enable migrations in production only
      // In test environment, we use synchronize instead of migrations
      migrations: process.env.NODE_ENV !== 'test' ? ['dist/migrations/*.js'] : [], // Don't load migrations in test/dev to avoid MigrationInterface import issues
      migrationsRun: process.env.NODE_ENV !== 'test',
      // Enable logging in test to debug schema synchronization issues
      logging: process.env.NODE_ENV === 'test' ? ['error', 'warn', 'schema'] : true,
      // Connection pool and retry options for better reliability
      extra: {
        max: 10, // Maximum pool size
        connectionTimeoutMillis: 30000, // 30 seconds timeout
        idleTimeoutMillis: 30000,
        // Retry configuration is handled by NestJS TypeORM module automatically
      },
      // Don't fail on connection errors in test mode - allow server to start
      // TypeORM will retry automatically
      retryAttempts: process.env.NODE_ENV === 'test' ? 10 : 3,
      retryDelay: 3000, // 3 seconds between retries
    }),
    TypeOrmModule.forFeature([RefreshToken]),
    AuthModule, // Módulo de autenticación
    ProjectsModule,
    EpisodesModule,
    SequencesModule,

    VersionsModule,
    UsersModule,
    StatusesModule,
    AssetsModule,

    NotesModule,
    FilesModule,
    SearchModule,

    HealthModule,
    ProjectPermissionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule {}
