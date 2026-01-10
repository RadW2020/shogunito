import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to create the project_permissions table
 *
 * This table enables project-level access control:
 * - Each row represents a user's permission for a specific project
 * - Roles: owner, contributor, viewer
 * - Unique constraint on (user_id, project_id) ensures one permission per user per project
 */
export class CreateProjectPermissions1765400100000 implements MigrationInterface {
  name = 'CreateProjectPermissions1765400100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the project_permissions table
    await queryRunner.query(`
      CREATE TABLE "project_permissions" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "project_id" INTEGER NOT NULL,
        "role" VARCHAR(20) NOT NULL DEFAULT 'viewer',
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_project_permissions_user_project" UNIQUE ("user_id", "project_id"),
        CONSTRAINT "FK_project_permissions_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_project_permissions_project" FOREIGN KEY ("project_id") 
          REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create indexes for fast lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_project_permissions_user" ON "project_permissions" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_project_permissions_project" ON "project_permissions" ("project_id")
    `);

    // Add check constraint for valid roles
    await queryRunner.query(`
      ALTER TABLE "project_permissions" 
      ADD CONSTRAINT "CHK_project_permissions_role" 
      CHECK (role IN ('owner', 'contributor', 'viewer'))
    `);

    // Auto-assign existing project creators as owners
    await queryRunner.query(`
      INSERT INTO "project_permissions" (user_id, project_id, role)
      SELECT created_by, id, 'owner'
      FROM "projects"
      WHERE created_by IS NOT NULL
      ON CONFLICT (user_id, project_id) DO NOTHING
    `);

    console.log('CreateProjectPermissions: Table created and existing project owners migrated');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the table and all associated constraints/indexes
    await queryRunner.query(`DROP TABLE IF EXISTS "project_permissions" CASCADE`);

    console.log('CreateProjectPermissions: Table dropped');
  }
}
