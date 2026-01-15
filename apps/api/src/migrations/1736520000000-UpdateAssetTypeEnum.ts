import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAssetTypeEnum1736520000000 implements MigrationInterface {
  name = 'UpdateAssetTypeEnum1736520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove default from column
    await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "assetType" DROP DEFAULT`);
    
    // 2. Rename old type
    await queryRunner.query(`ALTER TYPE "public"."assets_assettype_enum" RENAME TO "assets_assettype_enum_old"`);
    
    // 3. Create new type with updated values
    await queryRunner.query(`
      CREATE TYPE "public"."assets_assettype_enum" AS ENUM(
        'prompt', 'txt', 'json', 'subtitulos_ingles', 'subtitulos_espanol', 
        'director_script', 'audio_original', 'audio_caricaturizado_ingles', 
        'audio_caricaturizado_espanol'
      )
    `);
    
    // 4. Update column to use new type. Since we verified no data exists, we can use a safe default if needed, 
    // but here we just cast. If any data existed with old values not in new enum, this would fail.
    await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "assetType" TYPE "public"."assets_assettype_enum" USING "assetType"::text::"public"."assets_assettype_enum"`);
    
    // 5. Set new default
    await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "assetType" SET DEFAULT 'txt'`);
    
    // 6. Drop old type
    await queryRunner.query(`DROP TYPE "assets_assettype_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove default
    await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "assetType" DROP DEFAULT`);

    // 2. Rename current type
    await queryRunner.query(`ALTER TYPE "public"."assets_assettype_enum" RENAME TO "assets_assettype_enum_new"`);
    
    // 3. Recreate old type
    await queryRunner.query(`
      CREATE TYPE "public"."assets_assettype_enum" AS ENUM(
        'character', 'subtitles', 'imagen', 'audio', 'script', 'text'
      )
    `);
    
    // 4. Revert column type. Since we are going back, we might lose data that uses new types.
    // We'll map everything to 'text' as a fallback.
    await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "assetType" TYPE "public"."assets_assettype_enum" USING 'text'::"public"."assets_assettype_enum"`);
    
    // 5. Revert default
    await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "assetType" SET DEFAULT 'text'`);
    
    // 6. Drop new type
    await queryRunner.query(`DROP TYPE "assets_assettype_enum_new"`);
  }
}
