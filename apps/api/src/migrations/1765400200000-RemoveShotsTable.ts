import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveShotsTable1765400200000 implements MigrationInterface {
  name = 'RemoveShotsTable1765400200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove notes linked to shots
    await queryRunner.query(`DELETE FROM "notes" WHERE "link_type" = 'Shot'`);

    // 2. Remove versions linked to shots
    await queryRunner.query(`DELETE FROM "versions" WHERE "entity_type" = 'shot'`);

    // 3. Drop the shots table
    // Using CASCADE to ensure any lingering foreign keys are removed
    await queryRunner.query(`DROP TABLE IF EXISTS "shots" CASCADE`);
    
    // 4. Update the notes link_type enum if it exists in Postgres
    // Note: In some environments this might fail if the enum is shared or handled differently
    // but typically TypeORM uses a CHECK constraint or a native enum.
    // If it's a native enum named 'notes_link_type_enum', we could try to alter it, 
    // but it's safer to just let the rows be gone for now as TypeORM will handle the schema.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This is a destructive migration, "down" would require recreating the table
    // which we don't want to support for this refactor as the data is lost.
    // However, to keep TypeORM happy, we can create an empty table or just a log.
    console.warn('Down migration for RemoveShotsTable is not supported (data lost).');
  }
}
