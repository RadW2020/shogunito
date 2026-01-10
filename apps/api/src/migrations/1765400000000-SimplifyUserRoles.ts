import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to simplify user roles
 *
 * Roles being removed: producer, reviewer, viewer
 * Roles being kept: admin, director, artist, member
 *
 * Migration strategy:
 * - producer -> director (was a management role)
 * - reviewer -> director (had approval permissions)
 * - viewer -> member (read-only access)
 */
export class SimplifyUserRoles1765400000000 implements MigrationInterface {
  name = 'SimplifyUserRoles1765400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate producer users to director role
    await queryRunner.query(`
      UPDATE users 
      SET role = 'director' 
      WHERE role = 'producer'
    `);

    // Migrate reviewer users to director role
    await queryRunner.query(`
      UPDATE users 
      SET role = 'director' 
      WHERE role = 'reviewer'
    `);

    // Migrate viewer users to member role
    await queryRunner.query(`
      UPDATE users 
      SET role = 'member' 
      WHERE role = 'viewer'
    `);

    // Log the migration for audit purposes
    console.log('SimplifyUserRoles: Migrated producer, reviewer, viewer roles');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: This migration cannot be perfectly reversed as we don't know
    // which directors were originally producers vs reviewers.
    // We'll leave all directors as directors in the rollback.
    console.log(
      'SimplifyUserRoles: Rollback - Note: Cannot restore original producer/reviewer/viewer roles',
    );
  }
}
