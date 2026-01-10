import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Consolidated Initial Schema Migration for Shogunito
 * 
 * This migration creates all tables from scratch with the final schema:
 * - No shots table (removed in favor of image-centric sequences)
 * - Integer user IDs (not UUID)
 * - Status references via UUID foreign keys (not enums)
 * - Project permissions table for access control
 * - Simplified user roles (admin, director, artist, member)
 */
export class InitialSchema1736506000000 implements MigrationInterface {
  name = 'InitialSchema1736506000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // EXTENSION
    // ============================================
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ============================================
    // USERS TABLE (Integer ID)
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "password_hash" VARCHAR NOT NULL,
        "role" VARCHAR NOT NULL DEFAULT 'member',
        "refreshToken" VARCHAR,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastLoginAt" TIMESTAMP,
        "password_reset_token" VARCHAR,
        "password_reset_expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_role" ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_isActive" ON "users" ("isActive")`);

    // ============================================
    // STATUSES TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "statuses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "code" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "description" VARCHAR,
        "color" VARCHAR NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "applicable_entities" TEXT[] NOT NULL,
        "created_by" INTEGER,
        "assigned_to" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // ============================================
    // PROJECTS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "description" VARCHAR,
        "status_id" uuid,
        "client_name" VARCHAR,
        "start_date" VARCHAR,
        "end_date" VARCHAR,
        "created_by" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_projects_status_id" FOREIGN KEY ("status_id") 
          REFERENCES "statuses"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_projects_status_id" ON "projects" ("status_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_projects_created_at" ON "projects" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_projects_created_by" ON "projects" ("created_by")`);

    // ============================================
    // EPISODES TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "episodes" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL,
        "ep_number" INTEGER,
        "code" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "description" VARCHAR,
        "status_id" uuid,
        "duration" INTEGER,
        "cut_order" INTEGER NOT NULL DEFAULT 1,
        "created_by" INTEGER,
        "assigned_to" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_episodes_project_id" FOREIGN KEY ("project_id") 
          REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_episodes_status_id" FOREIGN KEY ("status_id") 
          REFERENCES "statuses"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_episodes_project_id" ON "episodes" ("project_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_episodes_status_id" ON "episodes" ("status_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_episodes_project_cut_order" ON "episodes" ("project_id", "cut_order")`);
    await queryRunner.query(`CREATE INDEX "IDX_episodes_created_by" ON "episodes" ("created_by")`);
    await queryRunner.query(`CREATE INDEX "IDX_episodes_assigned_to" ON "episodes" ("assigned_to")`);

    // ============================================
    // SEQUENCES TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "sequences" (
        "id" SERIAL PRIMARY KEY,
        "episode_id" INTEGER NOT NULL,
        "code" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "description" VARCHAR,
        "cut_order" INTEGER NOT NULL,
        "status_id" uuid,
        "duration" INTEGER,
        "story_id" VARCHAR,
        "created_by" INTEGER,
        "assigned_to" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_sequences_episode_id" FOREIGN KEY ("episode_id") 
          REFERENCES "episodes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sequences_status_id" FOREIGN KEY ("status_id") 
          REFERENCES "statuses"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_sequences_episode_id" ON "sequences" ("episode_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_sequences_status_id" ON "sequences" ("status_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_sequences_episode_cut_order" ON "sequences" ("episode_id", "cut_order")`);
    await queryRunner.query(`CREATE INDEX "IDX_sequences_created_by" ON "sequences" ("created_by")`);
    await queryRunner.query(`CREATE INDEX "IDX_sequences_assigned_to" ON "sequences" ("assigned_to")`);

    // ============================================
    // ASSETS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "public"."assets_assettype_enum" AS ENUM(
        'character', 'subtitles', 'imagen', 'audio', 'script', 'text'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "assets" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL,
        "code" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "assetType" "public"."assets_assettype_enum" NOT NULL DEFAULT 'text',
        "status_id" uuid,
        "description" VARCHAR,
        "thumbnail_path" VARCHAR,
        "created_by" INTEGER,
        "assigned_to" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_assets_project_id" FOREIGN KEY ("project_id") 
          REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assets_status_id" FOREIGN KEY ("status_id") 
          REFERENCES "statuses"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_assets_project_id" ON "assets" ("project_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_assets_status_id" ON "assets" ("status_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_assets_assetType" ON "assets" ("assetType")`);
    await queryRunner.query(`CREATE INDEX "IDX_assets_created_by" ON "assets" ("created_by")`);
    await queryRunner.query(`CREATE INDEX "IDX_assets_assigned_to" ON "assets" ("assigned_to")`);
    await queryRunner.query(`CREATE INDEX "IDX_assets_created_at" ON "assets" ("created_at")`);

    // ============================================
    // VERSIONS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "versions" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "status_id" uuid,
        "description" VARCHAR,
        "file_path" VARCHAR,
        "thumbnail_path" VARCHAR,
        "artist" VARCHAR,
        "created_by" INTEGER,
        "assigned_to" INTEGER,
        "format" VARCHAR,
        "frame_range" VARCHAR,
        "duration" NUMERIC(10,2),
        "version_number" INTEGER NOT NULL DEFAULT 1,
        "latest" BOOLEAN NOT NULL DEFAULT false,
        "entity_code" VARCHAR,
        "entity_id" INTEGER,
        "entity_type" VARCHAR,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "status_updated_at" TIMESTAMP,
        CONSTRAINT "FK_versions_status_id" FOREIGN KEY ("status_id") 
          REFERENCES "statuses"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_versions_status_id" ON "versions" ("status_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_versions_entity_id_latest" ON "versions" ("entity_id", "latest")`);
    await queryRunner.query(`CREATE INDEX "IDX_versions_entity_code_latest" ON "versions" ("entity_code", "latest")`);
    await queryRunner.query(`CREATE INDEX "IDX_versions_entity_id_type" ON "versions" ("entity_id", "entity_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_versions_entity_code_type" ON "versions" ("entity_code", "entity_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_versions_entity_type" ON "versions" ("entity_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_versions_latest" ON "versions" ("latest")`);
    await queryRunner.query(`CREATE INDEX "IDX_versions_created_at" ON "versions" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_versions_created_by" ON "versions" ("created_by")`);
    await queryRunner.query(`CREATE INDEX "IDX_versions_assigned_to" ON "versions" ("assigned_to")`);

    // ============================================
    // PLAYLISTS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "playlists" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL,
        "code" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "description" VARCHAR,
        "status_id" uuid,
        "version_codes" TEXT,
        "created_by" INTEGER,
        "assigned_to" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "status_updated_at" TIMESTAMP,
        CONSTRAINT "FK_playlists_project_id" FOREIGN KEY ("project_id") 
          REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_playlists_status_id" FOREIGN KEY ("status_id") 
          REFERENCES "statuses"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_playlists_project_id" ON "playlists" ("project_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_playlists_status_id" ON "playlists" ("status_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_playlists_created_by" ON "playlists" ("created_by")`);
    await queryRunner.query(`CREATE INDEX "IDX_playlists_assigned_to" ON "playlists" ("assigned_to")`);
    await queryRunner.query(`CREATE INDEX "IDX_playlists_created_at" ON "playlists" ("created_at")`);

    // ============================================
    // NOTES TABLE (without Shot link type)
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "public"."notes_linktype_enum" AS ENUM(
        'Project', 'Episode', 'Asset', 'Sequence', 'Playlist', 'Version'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."notes_notetype_enum" AS ENUM(
        'note', 'approval', 'revision', 'client_note'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "link_id" VARCHAR NOT NULL,
        "linkType" "public"."notes_linktype_enum" NOT NULL,
        "subject" VARCHAR NOT NULL,
        "content" TEXT NOT NULL,
        "noteType" "public"."notes_notetype_enum" NOT NULL DEFAULT 'note',
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "attachments" TEXT,
        "created_by" INTEGER,
        "assigned_to" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notes_link_id_linkType" ON "notes" ("link_id", "linkType")`);
    await queryRunner.query(`CREATE INDEX "IDX_notes_link_id_linkType_is_read" ON "notes" ("link_id", "linkType", "is_read")`);
    await queryRunner.query(`CREATE INDEX "IDX_notes_noteType" ON "notes" ("noteType")`);
    await queryRunner.query(`CREATE INDEX "IDX_notes_is_read" ON "notes" ("is_read")`);
    await queryRunner.query(`CREATE INDEX "IDX_notes_created_by" ON "notes" ("created_by")`);
    await queryRunner.query(`CREATE INDEX "IDX_notes_assigned_to" ON "notes" ("assigned_to")`);
    await queryRunner.query(`CREATE INDEX "IDX_notes_created_at" ON "notes" ("created_at")`);

    // ============================================
    // REFRESH TOKENS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "jti" VARCHAR NOT NULL UNIQUE,
        "token_family" VARCHAR NOT NULL,
        "token_hash" VARCHAR NOT NULL,
        "user_id" INTEGER NOT NULL,
        "is_revoked" BOOLEAN NOT NULL DEFAULT false,
        "is_used" BOOLEAN NOT NULL DEFAULT false,
        "expires_at" TIMESTAMP NOT NULL,
        "ip_address" VARCHAR,
        "user_agent" VARCHAR,
        "last_used_at" TIMESTAMP,
        "replaced_by_jti" VARCHAR,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_jti" ON "refresh_tokens" ("jti")`);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_token_family_is_revoked" ON "refresh_tokens" ("token_family", "is_revoked")`);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_user_id_is_revoked" ON "refresh_tokens" ("user_id", "is_revoked")`);

    // ============================================
    // NOTIFICATIONS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "type" VARCHAR NOT NULL,
        "title" VARCHAR NOT NULL,
        "message" TEXT NOT NULL,
        "entityType" VARCHAR,
        "entityId" VARCHAR,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "metadata" JSONB,
        "triggeredBy" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_userId" ON "notifications" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_isRead" ON "notifications" ("isRead")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_entityType_entityId" ON "notifications" ("entityType", "entityId")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_userId_createdAt" ON "notifications" ("userId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_userId_isRead" ON "notifications" ("userId", "isRead")`);

    // ============================================
    // AUDIT LOGS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "userId" INTEGER,
        "username" VARCHAR,
        "action" VARCHAR NOT NULL,
        "entityType" VARCHAR NOT NULL,
        "entityId" VARCHAR,
        "changes" JSONB,
        "ipAddress" VARCHAR,
        "userAgent" TEXT,
        "method" VARCHAR,
        "endpoint" VARCHAR,
        "statusCode" INTEGER,
        "errorMessage" TEXT,
        "metadata" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entityType" ON "audit_logs" ("entityType")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`);

    // ============================================
    // PROJECT PERMISSIONS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "project_permissions" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "project_id" INTEGER NOT NULL,
        "role" VARCHAR(20) NOT NULL DEFAULT 'viewer',
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_project_permissions_user_project" UNIQUE ("user_id", "project_id"),
        CONSTRAINT "FK_project_permissions_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_permissions_project" FOREIGN KEY ("project_id") 
          REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_project_permissions_role" CHECK (role IN ('owner', 'contributor', 'viewer'))
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_project_permissions_user" ON "project_permissions" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_project_permissions_project" ON "project_permissions" ("project_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order of creation (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "project_permissions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notes" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."notes_notetype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."notes_linktype_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "playlists" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "versions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."assets_assettype_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sequences" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "episodes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "statuses" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
  }
}
