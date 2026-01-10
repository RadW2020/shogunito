import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AuditLoggerInterceptor } from './common/interceptors/audit-logger.interceptor';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  Project,
  Episode,
  Sequence,
  Shot,
  Version,
  Asset,
  User,
  Status,
  Playlist,
  Note,
  Notification,
  ProjectPermission,
} from './entities';
import { AuditLog } from './entities/audit-log.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { ProjectsModule } from './projects/projects.module';
import { EpisodesModule } from './episodes/episodes.module';
import { ShotsModule } from './shots/shots.module';
import { SequencesModule } from './sequences/sequences.module';
import { VersionsModule } from './versions/versions.module';
import { UsersModule } from './users/users.module';
import { StatusesModule } from './statuses/statuses.module';
import { AssetsModule } from './assets/assets.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { NotesModule } from './notes/notes.module';
import { FilesModule } from './files/files.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { ProjectPermissionsModule } from './project-permissions/project-permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load .env.production when NODE_ENV=production
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        // In test environment, allow many more requests to avoid rate limiting issues
        limit: process.env.NODE_ENV === 'test' ? 10000 : 100, // 100 requests per 60 seconds
      },
      {
        name: 'strict',
        ttl: 60000, // 60 seconds
        // In test environment, allow many more requests to avoid rate limiting issues
        limit: process.env.NODE_ENV === 'test' ? 10000 : 10, // 10 requests per 60 seconds (for auth endpoints)
      },
    ]),
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
        Shot,
        Version,
        Asset,
        User,
        Status,
        Playlist,
        Note,
        AuditLog,
        RefreshToken,
        Notification,
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
    TypeOrmModule.forFeature([AuditLog]), // Required for AuditLoggerInterceptor
    AuditModule, // Global audit logging with Axiom integration and retention policy
    AuthModule, // Módulo de autenticación
    ProjectsModule,
    EpisodesModule,
    SequencesModule,
    ShotsModule,
    VersionsModule,
    UsersModule,
    StatusesModule,
    AssetsModule,
    PlaylistsModule,
    NotesModule,
    FilesModule,
    SearchModule,
    NotificationsModule,
    HealthModule,
    ProjectPermissionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Enable ThrottlerGuard based on THROTTLER_ENABLED environment variable (default: false)
    ...(process.env.THROTTLER_ENABLED === 'true'
      ? [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]
      : []),
    // Enable AuditLoggerInterceptor based on AUDIT_LOGGER_ENABLED environment variable (default: true)
    ...(process.env.AUDIT_LOGGER_ENABLED !== 'false'
      ? [
          {
            provide: APP_INTERCEPTOR,
            useClass: AuditLoggerInterceptor,
          },
        ]
      : []),
  ],
})
export class AppModule {}
