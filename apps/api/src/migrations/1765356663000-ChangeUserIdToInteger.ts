import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeUserIdToInteger1765356663000 implements MigrationInterface {
  name = 'ChangeUserIdToInteger1765356663000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop foreign key constraints and indexes that reference users.id
    // First, we need to handle any foreign keys that might reference users.id
    // Since created_by is currently VARCHAR, there shouldn't be FK constraints yet

    // Step 2: Create a temporary integer column for users.id
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "id_new" SERIAL
    `);

    // Step 3: Create a mapping table to track old UUID -> new integer mapping
    // Use a regular table instead of TEMP to ensure it persists across queries
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_id_mapping_temp
    `);

    await queryRunner.query(`
      CREATE TABLE user_id_mapping_temp AS
      SELECT id::text as old_id, id_new
      FROM users
      ORDER BY created_at
    `);

    // Step 4: Update all created_by columns to use the new integer IDs
    // We'll need to join with the mapping table for each table

    // Update projects.created_by
    await queryRunner.query(`
      UPDATE projects p
      SET created_by = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE p.created_by = um.old_id
    `);

    // Update assets.created_by
    await queryRunner.query(`
      UPDATE assets a
      SET created_by = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE a.created_by = um.old_id
    `);

    // Update shots.created_by
    await queryRunner.query(`
      UPDATE shots s
      SET created_by = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE s.created_by = um.old_id
    `);

    // Update sequences.created_by
    await queryRunner.query(`
      UPDATE sequences seq
      SET created_by = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE seq.created_by = um.old_id
    `);

    // Update episodes.created_by
    await queryRunner.query(`
      UPDATE episodes e
      SET created_by = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE e.created_by = um.old_id
    `);

    // Update statuses.created_by
    await queryRunner.query(`
      UPDATE statuses st
      SET created_by = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE st.created_by = um.old_id
    `);

    // Update playlists.created_by
    await queryRunner.query(`
      UPDATE playlists pl
      SET created_by = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE pl.created_by = um.old_id
    `);

    // Update versions.created_by
    await queryRunner.query(`
      UPDATE versions v
      SET created_by = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE v.created_by = um.old_id
    `);

    // Update notes.created_by
    await queryRunner.query(`
      UPDATE notes n
      SET created_by = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE n.created_by = um.old_id
    `);

    // Update refresh_tokens.user_id
    // First, we need to drop the FK constraint and change type to TEXT temporarily
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      DROP CONSTRAINT IF EXISTS "FK_3ddc983c5f7bcf132fd8732c3f4"
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ALTER COLUMN "user_id" TYPE TEXT USING user_id::text
    `);

    // Now update the values
    await queryRunner.query(`
      UPDATE refresh_tokens rt
      SET user_id = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE rt.user_id = um.old_id
    `);

    // Update notifications.userId and notifications.triggeredBy (camelCase in DB)
    // First convert to TEXT if needed, then update
    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ALTER COLUMN "userId" TYPE TEXT USING "userId"::text
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ALTER COLUMN "triggeredBy" TYPE TEXT USING "triggeredBy"::text
    `);

    await queryRunner.query(`
      UPDATE notifications n
      SET "userId" = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE n."userId" = um.old_id
    `);

    await queryRunner.query(`
      UPDATE notifications n
      SET "triggeredBy" = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE n."triggeredBy" = um.old_id
    `);

    // Update audit_logs.userId (camelCase in DB)
    // First convert to TEXT if needed, then update
    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ALTER COLUMN "userId" TYPE TEXT USING "userId"::text
    `);

    await queryRunner.query(`
      UPDATE audit_logs al
      SET "userId" = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE al."userId" = um.old_id
    `);

    // Update all assigned_to columns to use the new integer IDs
    // Note: projects table does not have assigned_to column
    await queryRunner.query(`
      UPDATE assets a
      SET assigned_to = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE a.assigned_to = um.old_id
    `);

    await queryRunner.query(`
      UPDATE shots s
      SET assigned_to = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE s.assigned_to = um.old_id
    `);

    await queryRunner.query(`
      UPDATE sequences seq
      SET assigned_to = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE seq.assigned_to = um.old_id
    `);

    await queryRunner.query(`
      UPDATE episodes e
      SET assigned_to = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE e.assigned_to = um.old_id
    `);

    await queryRunner.query(`
      UPDATE statuses st
      SET assigned_to = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE st.assigned_to = um.old_id
    `);

    await queryRunner.query(`
      UPDATE playlists pl
      SET assigned_to = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE pl.assigned_to = um.old_id
    `);

    await queryRunner.query(`
      UPDATE versions v
      SET assigned_to = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE v.assigned_to = um.old_id
    `);

    await queryRunner.query(`
      UPDATE notes n
      SET assigned_to = CAST(um.id_new AS TEXT)
      FROM user_id_mapping_temp um
      WHERE n.assigned_to = um.old_id
    `);

    // Step 5: Change all created_by columns from VARCHAR to INTEGER
    // First, set NULL for any values that couldn't be mapped (non-UUID values)
    await queryRunner.query(`
      UPDATE projects 
      SET created_by = NULL 
      WHERE created_by IS NOT NULL 
      AND created_by NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "projects" 
      ALTER COLUMN "created_by" TYPE INTEGER USING 
        CASE 
          WHEN created_by ~ '^[0-9]+$' THEN CAST(created_by AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE assets 
      SET created_by = NULL 
      WHERE created_by IS NOT NULL 
      AND created_by NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "assets" 
      ALTER COLUMN "created_by" TYPE INTEGER USING 
        CASE 
          WHEN created_by ~ '^[0-9]+$' THEN CAST(created_by AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE shots 
      SET created_by = NULL 
      WHERE created_by IS NOT NULL 
      AND created_by NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "shots" 
      ALTER COLUMN "created_by" TYPE INTEGER USING 
        CASE 
          WHEN created_by ~ '^[0-9]+$' THEN CAST(created_by AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE sequences 
      SET created_by = NULL 
      WHERE created_by IS NOT NULL 
      AND created_by NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "sequences" 
      ALTER COLUMN "created_by" TYPE INTEGER USING 
        CASE 
          WHEN created_by ~ '^[0-9]+$' THEN CAST(created_by AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE episodes 
      SET created_by = NULL 
      WHERE created_by IS NOT NULL 
      AND created_by NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "episodes" 
      ALTER COLUMN "created_by" TYPE INTEGER USING 
        CASE 
          WHEN created_by ~ '^[0-9]+$' THEN CAST(created_by AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE statuses 
      SET created_by = NULL 
      WHERE created_by IS NOT NULL 
      AND created_by NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "statuses" 
      ALTER COLUMN "created_by" TYPE INTEGER USING 
        CASE 
          WHEN created_by ~ '^[0-9]+$' THEN CAST(created_by AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE playlists 
      SET created_by = NULL 
      WHERE created_by IS NOT NULL 
      AND created_by NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "playlists" 
      ALTER COLUMN "created_by" TYPE INTEGER USING 
        CASE 
          WHEN created_by ~ '^[0-9]+$' THEN CAST(created_by AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE versions 
      SET created_by = NULL 
      WHERE created_by IS NOT NULL 
      AND created_by NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "versions" 
      ALTER COLUMN "created_by" TYPE INTEGER USING 
        CASE 
          WHEN created_by ~ '^[0-9]+$' THEN CAST(created_by AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE notes 
      SET created_by = NULL 
      WHERE created_by IS NOT NULL 
      AND created_by NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "notes" 
      ALTER COLUMN "created_by" TYPE INTEGER USING 
        CASE 
          WHEN created_by ~ '^[0-9]+$' THEN CAST(created_by AS INTEGER)
          ELSE NULL
        END
    `);

    // Step 5b: Change all assigned_to columns from VARCHAR to INTEGER
    // Note: projects table does not have assigned_to column
    await queryRunner.query(`
      UPDATE assets 
      SET assigned_to = NULL 
      WHERE assigned_to IS NOT NULL 
      AND assigned_to NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "assets" 
      ALTER COLUMN "assigned_to" TYPE INTEGER USING 
        CASE 
          WHEN assigned_to ~ '^[0-9]+$' THEN CAST(assigned_to AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE shots 
      SET assigned_to = NULL 
      WHERE assigned_to IS NOT NULL 
      AND assigned_to NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "shots" 
      ALTER COLUMN "assigned_to" TYPE INTEGER USING 
        CASE 
          WHEN assigned_to ~ '^[0-9]+$' THEN CAST(assigned_to AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE sequences 
      SET assigned_to = NULL 
      WHERE assigned_to IS NOT NULL 
      AND assigned_to NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "sequences" 
      ALTER COLUMN "assigned_to" TYPE INTEGER USING 
        CASE 
          WHEN assigned_to ~ '^[0-9]+$' THEN CAST(assigned_to AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE episodes 
      SET assigned_to = NULL 
      WHERE assigned_to IS NOT NULL 
      AND assigned_to NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "episodes" 
      ALTER COLUMN "assigned_to" TYPE INTEGER USING 
        CASE 
          WHEN assigned_to ~ '^[0-9]+$' THEN CAST(assigned_to AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE statuses 
      SET assigned_to = NULL 
      WHERE assigned_to IS NOT NULL 
      AND assigned_to NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "statuses" 
      ALTER COLUMN "assigned_to" TYPE INTEGER USING 
        CASE 
          WHEN assigned_to ~ '^[0-9]+$' THEN CAST(assigned_to AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE playlists 
      SET assigned_to = NULL 
      WHERE assigned_to IS NOT NULL 
      AND assigned_to NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "playlists" 
      ALTER COLUMN "assigned_to" TYPE INTEGER USING 
        CASE 
          WHEN assigned_to ~ '^[0-9]+$' THEN CAST(assigned_to AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE versions 
      SET assigned_to = NULL 
      WHERE assigned_to IS NOT NULL 
      AND assigned_to NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "versions" 
      ALTER COLUMN "assigned_to" TYPE INTEGER USING 
        CASE 
          WHEN assigned_to ~ '^[0-9]+$' THEN CAST(assigned_to AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      UPDATE notes 
      SET assigned_to = NULL 
      WHERE assigned_to IS NOT NULL 
      AND assigned_to NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "notes" 
      ALTER COLUMN "assigned_to" TYPE INTEGER USING 
        CASE 
          WHEN assigned_to ~ '^[0-9]+$' THEN CAST(assigned_to AS INTEGER)
          ELSE NULL
        END
    `);

    // Step 5c: Change notifications.userId and notifications.triggeredBy from TEXT to INTEGER
    // Set NULL for any values that couldn't be mapped
    await queryRunner.query(`
      UPDATE notifications 
      SET "userId" = NULL 
      WHERE "userId" IS NOT NULL 
      AND "userId" NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      UPDATE notifications 
      SET "triggeredBy" = NULL 
      WHERE "triggeredBy" IS NOT NULL 
      AND "triggeredBy" NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ALTER COLUMN "userId" TYPE INTEGER USING 
        CASE 
          WHEN "userId" ~ '^[0-9]+$' THEN CAST("userId" AS INTEGER)
          ELSE NULL
        END
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ALTER COLUMN "triggeredBy" TYPE INTEGER USING 
        CASE 
          WHEN "triggeredBy" ~ '^[0-9]+$' THEN CAST("triggeredBy" AS INTEGER)
          ELSE NULL
        END
    `);

    // Step 5c: Change audit_logs.userId from TEXT to INTEGER
    // First, drop NOT NULL constraint if it exists
    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ALTER COLUMN "userId" DROP NOT NULL
    `);

    await queryRunner.query(`
      UPDATE audit_logs 
      SET "userId" = NULL 
      WHERE "userId" IS NOT NULL 
      AND "userId" NOT IN (SELECT old_id FROM user_id_mapping_temp)
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ALTER COLUMN "userId" TYPE INTEGER USING 
        CASE 
          WHEN "userId" ~ '^[0-9]+$' THEN CAST("userId" AS INTEGER)
          ELSE NULL
        END
    `);

    // Step 5d: refresh_tokens.user_id FK constraint already dropped and type changed to TEXT above
    // Step 6: Drop old users.id column and rename id_new to id
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "id"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" RENAME COLUMN "id_new" TO "id"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
    `);

    // Step 7: Change refresh_tokens.user_id from TEXT to INTEGER (after users.id is integer)
    // Note: user_id was already changed to TEXT in Step 4, now we change it to INTEGER
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ALTER COLUMN "user_id" TYPE INTEGER USING CAST(user_id AS INTEGER)
    `);

    // Step 8: Re-add foreign key constraint for refresh_tokens
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Step 8: Add foreign key constraints for created_by (optional, but recommended for data integrity)
    // Note: We'll add these as optional since they might not be needed depending on your use case
    // Uncomment if you want to enforce referential integrity:
    /*
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "FK_projects_created_by" 
      FOREIGN KEY ("created_by") REFERENCES "users"("id") 
      ON DELETE SET NULL
    `);
    */

    // Step 9: Clean up the temporary mapping table
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_id_mapping_temp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the migration - convert back to UUID
    // This is complex and may result in data loss, so we'll keep it simple

    // Step 1: Change users.id back to UUID
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "id_old" uuid DEFAULT uuid_generate_v4()
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "id"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" RENAME COLUMN "id_old" TO "id"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
    `);

    // Step 2: Change all created_by columns back to VARCHAR
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ALTER COLUMN "created_by" TYPE VARCHAR USING CAST(created_by AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "assets" 
      ALTER COLUMN "created_by" TYPE VARCHAR USING CAST(created_by AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "shots" 
      ALTER COLUMN "created_by" TYPE VARCHAR USING CAST(created_by AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "sequences" 
      ALTER COLUMN "created_by" TYPE VARCHAR USING CAST(created_by AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "episodes" 
      ALTER COLUMN "created_by" TYPE VARCHAR USING CAST(created_by AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "statuses" 
      ALTER COLUMN "created_by" TYPE VARCHAR USING CAST(created_by AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "playlists" 
      ALTER COLUMN "created_by" TYPE VARCHAR USING CAST(created_by AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "versions" 
      ALTER COLUMN "created_by" TYPE VARCHAR USING CAST(created_by AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "notes" 
      ALTER COLUMN "created_by" TYPE VARCHAR USING CAST(created_by AS VARCHAR)
    `);

    // Revert all assigned_to columns back to VARCHAR
    // Note: projects table does not have assigned_to column
    await queryRunner.query(`
      ALTER TABLE "assets" 
      ALTER COLUMN "assigned_to" TYPE VARCHAR USING CAST(assigned_to AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "shots" 
      ALTER COLUMN "assigned_to" TYPE VARCHAR USING CAST(assigned_to AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "sequences" 
      ALTER COLUMN "assigned_to" TYPE VARCHAR USING CAST(assigned_to AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "episodes" 
      ALTER COLUMN "assigned_to" TYPE VARCHAR USING CAST(assigned_to AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "statuses" 
      ALTER COLUMN "assigned_to" TYPE VARCHAR USING CAST(assigned_to AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "playlists" 
      ALTER COLUMN "assigned_to" TYPE VARCHAR USING CAST(assigned_to AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "versions" 
      ALTER COLUMN "assigned_to" TYPE VARCHAR USING CAST(assigned_to AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "notes" 
      ALTER COLUMN "assigned_to" TYPE VARCHAR USING CAST(assigned_to AS VARCHAR)
    `);

    // Revert audit_logs.userId
    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ALTER COLUMN "userId" TYPE VARCHAR USING CAST("userId" AS VARCHAR)
    `);

    // Revert notifications.userId and notifications.triggeredBy
    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ALTER COLUMN "triggeredBy" TYPE VARCHAR USING CAST("triggeredBy" AS VARCHAR)
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ALTER COLUMN "userId" TYPE VARCHAR USING CAST("userId" AS VARCHAR)
    `);

    // Revert refresh_tokens.user_id (from INTEGER -> TEXT -> UUID)
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      DROP CONSTRAINT IF EXISTS "FK_3ddc983c5f7bcf132fd8732c3f4"
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ALTER COLUMN "user_id" TYPE TEXT USING CAST(user_id AS TEXT)
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ALTER COLUMN "user_id" TYPE uuid USING user_id::uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") 
      ON DELETE CASCADE
    `);
  }
}
