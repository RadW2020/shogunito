import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAssetTypeEnum1764449010000 implements MigrationInterface {
  name = 'UpdateAssetTypeEnum1764449010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new enum values to the existing enum type
    // PostgreSQL allows adding values to an enum, but not removing them easily
    // The old values will remain in the enum for backward compatibility
    // Using DO block to safely add values only if they don't exist

    // IMPORTANT: PostgreSQL doesn't allow using a newly added enum value in the same transaction.
    // We need to commit after adding enum values before we can use them.
    // TypeORM executes migrations in a transaction, so we need to work around this.

    // Solution: Use separate queries and let TypeORM handle the transaction boundaries,
    // or use a stored procedure that commits internally.
    // The safest approach is to add all enum values first, then set defaults in a separate step.

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'subtitles' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assets_assettype_enum')
        ) THEN
          ALTER TYPE "public"."assets_assettype_enum" ADD VALUE 'subtitles';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'imagen' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assets_assettype_enum')
        ) THEN
          ALTER TYPE "public"."assets_assettype_enum" ADD VALUE 'imagen';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'audio' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assets_assettype_enum')
        ) THEN
          ALTER TYPE "public"."assets_assettype_enum" ADD VALUE 'audio';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'text' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assets_assettype_enum')
        ) THEN
          ALTER TYPE "public"."assets_assettype_enum" ADD VALUE 'text';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'video' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assets_assettype_enum')
        ) THEN
          ALTER TYPE "public"."assets_assettype_enum" ADD VALUE 'video';
        END IF;
      END $$;
    `);
    // 'script' already exists in the enum, so we don't need to add it

    // CRITICAL: PostgreSQL requires a commit after adding enum values before they can be used.
    // Since TypeORM runs migrations in a transaction, we need to commit the transaction
    // before we can use the new enum values. We'll do this by committing and starting a new transaction.
    await queryRunner.commitTransaction();
    await queryRunner.startTransaction();

    // Now we can safely set the default value using the newly added 'text' enum value
    await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "assetType" SET DEFAULT 'text'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert default value
    await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "assetType" SET DEFAULT 'prop'`);

    // Note: PostgreSQL doesn't support removing enum values directly
    // To fully revert, you would need to:
    // 1. Create a new enum with only the old values
    // 2. Migrate data
    // 3. Drop the old enum
    // 4. Rename the new enum
    // This is complex and risky, so we'll leave the new values in the enum
    // They just won't be used by the application code
  }
}
