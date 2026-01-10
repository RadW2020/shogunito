import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCutOrderToEpisodes1764451200000 implements MigrationInterface {
  name = 'AddCutOrderToEpisodes1764451200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add cut_order column to episodes table
    await queryRunner.query(`
      ALTER TABLE "episodes" 
      ADD COLUMN "cut_order" integer NOT NULL DEFAULT 1
    `);

    // Create index for ordering episodes within project
    await queryRunner.query(`
      CREATE INDEX "IDX_episodes_project_cut_order" 
      ON "episodes" ("project_id", "cut_order")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_episodes_project_cut_order"
    `);

    // Remove the cut_order column
    await queryRunner.query(`
      ALTER TABLE "episodes" 
      DROP COLUMN IF EXISTS "cut_order"
    `);
  }
}
