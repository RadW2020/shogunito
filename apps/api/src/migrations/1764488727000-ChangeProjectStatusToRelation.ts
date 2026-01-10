import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeProjectStatusToRelation1764488727000 implements MigrationInterface {
  name = 'ChangeProjectStatusToRelation1764488727000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old indexes that use status column
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_status"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_status_created_at"
    `);

    // Add status_id column
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD COLUMN "status_id" uuid
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "FK_projects_status_id" 
      FOREIGN KEY ("status_id") REFERENCES "statuses"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Create new indexes for status_id
    await queryRunner.query(`
      CREATE INDEX "IDX_projects_status_id" ON "projects" ("status_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_projects_status_created_at" ON "projects" ("status_id", "created_at")
    `);

    // Drop old status column and enum type
    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN IF EXISTS "status"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."projects_status_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_status_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_status_created_at"
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_status_id"
    `);

    // Drop status_id column
    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN IF EXISTS "status_id"
    `);

    // Recreate enum type
    await queryRunner.query(`
      CREATE TYPE "public"."projects_status_enum" AS ENUM('active', 'bidding', 'onhold', 'completed')
    `);

    // Recreate status column with enum type
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD COLUMN "status" "public"."projects_status_enum" NOT NULL DEFAULT 'active'
    `);

    // Recreate old indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_projects_status" ON "projects" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_projects_status_created_at" ON "projects" ("status", "created_at")
    `);
  }
}
