import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeStatusToVarchar1764451300000 implements MigrationInterface {
  name = 'ChangeStatusToVarchar1764451300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old indexes that use status column
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_7c81a9ab7cea8fc30aace82cf6"
    `); // episodes project_id + status
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_9195b9787db57f3cc6dd65ef83"
    `); // episodes status
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_4999df33b13615c77d70a94ecf"
    `); // sequences episode_id + status
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_0b9842ca7f709398ee1bb5ec3c"
    `); // sequences status
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_042599dd996d8eb27c2b55216a"
    `); // shots sequence_id + status
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_bca8700a294b5b8af99a2997f5"
    `); // shots status
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_88c4e67768a0ab6925b9f39f32"
    `); // assets project_id + status
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_06be3e2fd34f70a8e68e518dbf"
    `); // assets status
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_playlists_status"
    `); // playlists status
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_playlists_project_status"
    `); // playlists project_id + status

    // Add status_id columns
    await queryRunner.query(`
      ALTER TABLE "episodes" 
      ADD COLUMN "status_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "sequences" 
      ADD COLUMN "status_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "shots" 
      ADD COLUMN "status_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "versions" 
      ADD COLUMN "status_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "assets" 
      ADD COLUMN "status_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "playlists" 
      ADD COLUMN "status_id" uuid
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "episodes" 
      ADD CONSTRAINT "FK_episodes_status_id" 
      FOREIGN KEY ("status_id") REFERENCES "statuses"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "sequences" 
      ADD CONSTRAINT "FK_sequences_status_id" 
      FOREIGN KEY ("status_id") REFERENCES "statuses"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "shots" 
      ADD CONSTRAINT "FK_shots_status_id" 
      FOREIGN KEY ("status_id") REFERENCES "statuses"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "versions" 
      ADD CONSTRAINT "FK_versions_status_id" 
      FOREIGN KEY ("status_id") REFERENCES "statuses"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "assets" 
      ADD CONSTRAINT "FK_assets_status_id" 
      FOREIGN KEY ("status_id") REFERENCES "statuses"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "playlists" 
      ADD CONSTRAINT "FK_playlists_status_id" 
      FOREIGN KEY ("status_id") REFERENCES "statuses"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Create new indexes for status_id
    await queryRunner.query(`
      CREATE INDEX "IDX_episodes_status_id" ON "episodes" ("status_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_episodes_project_status" ON "episodes" ("project_id", "status_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sequences_status_id" ON "sequences" ("status_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sequences_episode_status" ON "sequences" ("episode_id", "status_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_shots_status_id" ON "shots" ("status_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_shots_sequence_status" ON "shots" ("sequence_id", "status_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_versions_status_id" ON "versions" ("status_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_assets_status_id" ON "assets" ("status_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_assets_project_status" ON "assets" ("project_id", "status_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_playlists_status_id" ON "playlists" ("status_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_playlists_project_status" ON "playlists" ("project_id", "status_id")
    `);

    // Drop old status columns and enum types
    await queryRunner.query(`
      ALTER TABLE "episodes" DROP COLUMN IF EXISTS "status"
    `);

    await queryRunner.query(`
      ALTER TABLE "sequences" DROP COLUMN IF EXISTS "status"
    `);

    await queryRunner.query(`
      ALTER TABLE "shots" DROP COLUMN IF EXISTS "status"
    `);

    await queryRunner.query(`
      ALTER TABLE "versions" DROP COLUMN IF EXISTS "status"
    `);

    await queryRunner.query(`
      ALTER TABLE "assets" DROP COLUMN IF EXISTS "status"
    `);

    await queryRunner.query(`
      ALTER TABLE "playlists" DROP COLUMN IF EXISTS "status"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."episodes_status_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."sequences_status_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."shots_status_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."versions_status_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."assets_status_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."playlists_status_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_episodes_status_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_episodes_project_status"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sequences_status_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sequences_episode_status"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_shots_status_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_shots_sequence_status"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_versions_status_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_assets_status_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_assets_project_status"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_playlists_status_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_playlists_project_status"
    `);

    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "episodes" DROP CONSTRAINT IF EXISTS "FK_episodes_status_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "sequences" DROP CONSTRAINT IF EXISTS "FK_sequences_status_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "shots" DROP CONSTRAINT IF EXISTS "FK_shots_status_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "versions" DROP CONSTRAINT IF EXISTS "FK_versions_status_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "FK_assets_status_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "playlists" DROP CONSTRAINT IF EXISTS "FK_playlists_status_id"
    `);

    // Drop status_id columns
    await queryRunner.query(`
      ALTER TABLE "episodes" DROP COLUMN IF EXISTS "status_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "sequences" DROP COLUMN IF EXISTS "status_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "shots" DROP COLUMN IF EXISTS "status_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "versions" DROP COLUMN IF EXISTS "status_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "assets" DROP COLUMN IF EXISTS "status_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "playlists" DROP COLUMN IF EXISTS "status_id"
    `);

    // Recreate enum types
    await queryRunner.query(`
      CREATE TYPE "public"."episodes_status_enum" AS ENUM('waiting', 'in_progress', 'review', 'approved', 'final')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."sequences_status_enum" AS ENUM('waiting', 'in_progress', 'review', 'approved', 'final')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."shots_status_enum" AS ENUM('waiting', 'in_progress', 'review', 'approved', 'final')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."versions_status_enum" AS ENUM('wip', 'review', 'approved', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."assets_status_enum" AS ENUM('waiting', 'in_progress', 'review', 'approved', 'final')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."playlists_status_enum" AS ENUM('waiting', 'in_progress', 'review', 'approved', 'final')
    `);

    // Recreate status columns with enum types
    await queryRunner.query(`
      ALTER TABLE "episodes" 
      ADD COLUMN "status" "public"."episodes_status_enum" NOT NULL DEFAULT 'waiting'
    `);

    await queryRunner.query(`
      ALTER TABLE "sequences" 
      ADD COLUMN "status" "public"."sequences_status_enum" NOT NULL DEFAULT 'waiting'
    `);

    await queryRunner.query(`
      ALTER TABLE "shots" 
      ADD COLUMN "status" "public"."shots_status_enum" NOT NULL DEFAULT 'waiting'
    `);

    await queryRunner.query(`
      ALTER TABLE "versions" 
      ADD COLUMN "status" "public"."versions_status_enum" NOT NULL DEFAULT 'wip'
    `);

    await queryRunner.query(`
      ALTER TABLE "assets" 
      ADD COLUMN "status" "public"."assets_status_enum" NOT NULL DEFAULT 'waiting'
    `);

    await queryRunner.query(`
      ALTER TABLE "playlists" 
      ADD COLUMN "status" "public"."playlists_status_enum" NOT NULL DEFAULT 'waiting'
    `);

    // Recreate old indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_7c81a9ab7cea8fc30aace82cf6" ON "episodes" ("project_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_9195b9787db57f3cc6dd65ef83" ON "episodes" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_4999df33b13615c77d70a94ecf" ON "sequences" ("episode_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_0b9842ca7f709398ee1bb5ec3c" ON "sequences" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_042599dd996d8eb27c2b55216a" ON "shots" ("sequence_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_bca8700a294b5b8af99a2997f5" ON "shots" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_88c4e67768a0ab6925b9f39f32" ON "assets" ("project_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_06be3e2fd34f70a8e68e518dbf" ON "assets" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_playlists_status" ON "playlists" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_playlists_project_status" ON "playlists" ("project_id", "status")
    `);
  }
}
