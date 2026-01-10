import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Project,
  Episode,
  Asset,
  Sequence,
  Version,
  Status,
  User,
} from '../entities';
import { AssetType } from '@shogun/shared';

/**
 * SeedService - Lightweight seed for development and test environments
 *
 * IMPORTANT: This seed is PRODUCTION-SAFE:
 * - Does NOT drop or truncate any tables
 * - Only creates data if it doesn't exist
 * - Creates minimal sample data (1 of each entity)
 * - Should only be run in development or test environments
 */
@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Episode)
    private episodeRepository: Repository<Episode>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(Sequence)
    private sequenceRepository: Repository<Sequence>,
    @InjectRepository(Version)
    private versionRepository: Repository<Version>,
    @InjectRepository(Status)
    private statusRepository: Repository<Status>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Helper method to get statusId by status code
   */
  private async getStatusIdByCode(statusCode: string): Promise<string | null> {
    if (!statusCode) return null;
    try {
      const status = await this.statusRepository.findOne({
        where: { code: statusCode },
      });
      if (!status) {
        console.warn(`⚠️  Status with code '${statusCode}' not found`);
        return null;
      }
      return status.id;
    } catch (error) {
      console.error(`❌ Error finding status '${statusCode}':`, error);
      return null;
    }
  }

  /**
   * Main seed method - creates minimal sample data
   * Only runs if data doesn't already exist
   */
  async seed() {
    console.log('🌱 Starting lightweight seed process...');
    console.log('⚠️  This seed is PRODUCTION-SAFE - does not drop tables');

    // Seed in order of dependencies
    await this.seedStatuses();
    await this.seedUsers();
    await this.seedMinimalData();

    console.log('✅ Seed completed successfully!');
  }

  /**
   * Seed basic statuses required by the system
   */
  private async seedStatuses() {
    console.log('📊 Seeding statuses...');

    // Check if statuses already exist
    const existingCount = await this.statusRepository.count();
    if (existingCount > 0) {
      console.log(`ℹ️  Statuses already exist (${existingCount} found), skipping...`);
      return;
    }

    const statuses = [
      {
        code: 'waiting',
        name: 'Waiting',
        description: 'Waiting for assignment or approval',
        color: '#f59e0b',
        applicableEntities: ['project'] as any,
        isActive: true,
        sortOrder: 1,
        createdBy: null, // System seed, no user
        assignedTo: null, // System seed, no user
      },
      {
        code: 'in_progress',
        name: 'In Progress',
        description: 'Currently being worked on',
        color: '#3b82f6',
        applicableEntities: ['project', 'sequence', 'shot'] as any,
        isActive: true,
        sortOrder: 2,
        createdBy: null, // System seed, no user
        assignedTo: null, // System seed, no user
      },
      {
        code: 'review',
        name: 'Review',
        description: 'Under review for approval',
        color: '#8b5cf6',
        applicableEntities: ['all'] as any,
        isActive: true,
        sortOrder: 3,
        createdBy: null, // System seed, no user
        assignedTo: null, // System seed, no user
      },
      {
        code: 'approved',
        name: 'Approved',
        description: 'Approved and ready for next stage',
        color: '#10b981',
        applicableEntities: ['version', 'asset'] as any,
        isActive: true,
        sortOrder: 4,
        createdBy: null, // System seed, no user
        assignedTo: null, // System seed, no user
      },
      {
        code: 'final',
        name: 'Final',
        description: 'Final version, no further changes',
        color: '#059669',
        applicableEntities: ['version'] as any,
        isActive: true,
        sortOrder: 5,
        createdBy: null, // System seed, no user
        assignedTo: null, // System seed, no user
      },
      {
        code: 'active',
        name: 'Active',
        description: 'Currently active in production',
        color: '#22c55e',
        applicableEntities: ['project'] as any,
        isActive: true,
        sortOrder: 1,
        createdBy: null, // System seed, no user
        assignedTo: null, // System seed, no user
      },
      {
        code: 'wip',
        name: 'Work In Progress',
        description: 'Work in progress',
        color: '#3b82f6',
        applicableEntities: ['version'] as any,
        isActive: true,
        sortOrder: 2,
        createdBy: null, // System seed, no user
        assignedTo: null, // System seed, no user
      },
    ];

    for (const status of statuses) {
      await this.statusRepository.save(status);
    }
    console.log(`✅ Created ${statuses.length} statuses`);
  }

  /**
   * Seed a single admin user
   */
  private async seedUsers() {
    console.log('👤 Seeding users...');

    // Check if admin user already exists
    const existingAdmin = await this.userRepository.findOne({
      where: { email: 'admin@shogun.com' },
    });

    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists, skipping...');
      return;
    }

    const userData = {
      email: 'admin@shogun.com',
      name: 'Admin',
      role: 'admin' as const,
      password: 'Admin123!',
    };

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const user = this.userRepository.create({
      ...userData,
      passwordHash: hashedPassword,
      password: undefined,
    });

    await this.userRepository.save(user);
    console.log('✅ Created admin user (admin@shogun.com / Admin123!)');
  }

  /**
   * Seed minimal sample data: 1 project, 1 episode, 1 sequence, 1 shot, 1 asset, 2 versions
   */
  private async seedMinimalData() {
    console.log('📦 Seeding minimal sample data...');

    // Check if project already exists
    const existingProject = await this.projectRepository.findOne({
      where: { code: 'DEMO' },
    });

    if (existingProject) {
      console.log('ℹ️  Sample project already exists, skipping minimal data seed...');
      return;
    }

    // Get status IDs
    const activeStatusId = await this.getStatusIdByCode('active');
    const inProgressStatusId = await this.getStatusIdByCode('in_progress');
    const wipStatusId = await this.getStatusIdByCode('wip');

    // 1. Create one project
    console.log('  📁 Creating sample project...');
    const project = await this.projectRepository.save({
      code: 'DEMO',
      name: 'Demo Project',
      description: 'Sample project for development and testing',
      statusId: activeStatusId,
      clientName: 'Demo Client',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      createdBy: null, // Seed data, no user
    });

    // 2. Create one episode
    console.log('  📺 Creating sample episode...');
    const episode = await this.episodeRepository.save({
      projectId: project.id,
      epNumber: 1,
      code: 'EP01',
      name: 'Episode 01',
      description: 'First episode of the demo project',
      statusId: inProgressStatusId,
      duration: 180,
      frameRate: 24,
      createdBy: null, // Seed data, no user
      assignedTo: null, // Seed data, no user
    });

    // 3. Create one sequence
    console.log('  🎬 Creating sample sequence...');
    const sequence = await this.sequenceRepository.save({
      episodeId: episode.id,
      code: 'EP01_SEQ01',
      name: 'Sequence 01',
      description: 'First sequence of episode 01',
      cutOrder: 1,
      statusId: inProgressStatusId,
      duration: 30,
      createdBy: null, // Seed data, no user
      assignedTo: null, // Seed data, no user
    });

    // 4. Create one shot
    console.log('  🎥 Creating sample shot...');
    const shot = await this.shotRepository.save({
      sequenceId: sequence.id,
      code: 'EP01_SEQ01_SH01',
      name: 'Shot 01',
      description: 'First shot of sequence 01',
      cutOrder: 1,
      sequenceNumber: 1,
      statusId: inProgressStatusId,
      shotType: ShotType.MEDIUM,
      duration: 5,
      createdBy: null, // Seed data, no user
      assignedTo: null, // Seed data, no user
    });

    // 5. Create one asset
    console.log('  🎨 Creating sample asset...');
    const asset = await this.assetRepository.save({
      projectId: project.id,
      code: 'DEMO_ASSET_01',
      name: 'Demo Asset',
      assetType: AssetType.TEXT,
      statusId: inProgressStatusId,
      description: 'Sample asset for development',
      createdBy: null, // Seed data, no user
      assignedTo: null, // Seed data, no user
    });

    // 6. Create one version for the shot
    console.log('  📹 Creating sample version (shot)...');
    await this.versionRepository.save({
      code: 'EP01_SEQ01_SH01_V001',
      name: 'Shot 01 - Version 001',
      versionNumber: 1,
      statusId: wipStatusId,
      description: 'First version of shot 01',
      artist: 'Admin',
      createdBy: null, // Seed data, no user
      assignedTo: null, // Seed data, no user
      latest: true,
      entityCode: shot.code,
      entityType: 'shot',
      duration: 5.0,
    });

    // 7. Create one version for the asset
    console.log('  📹 Creating sample version (asset)...');
    await this.versionRepository.save({
      code: 'DEMO_ASSET_01_V001',
      name: 'Demo Asset - Version 001',
      versionNumber: 1,
      statusId: wipStatusId,
      description: 'First version of demo asset',
      artist: 'Admin',
      createdBy: null, // Seed data, no user
      assignedTo: null, // Seed data, no user
      latest: true,
      entityCode: asset.code,
      entityType: 'asset',
      duration: 2.0,
    });

    console.log('✅ Minimal sample data created successfully!');
    console.log('   - 1 Project (DEMO)');
    console.log('   - 1 Episode (EP01)');
    console.log('   - 1 Sequence (EP01_SEQ01)');
    console.log('   - 1 Shot (EP01_SEQ01_SH01)');
    console.log('   - 1 Asset (DEMO_ASSET_01)');
    console.log('   - 2 Versions (1 for shot, 1 for asset)');
  }
}
