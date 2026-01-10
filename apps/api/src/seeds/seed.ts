import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { SeedService } from './seed.service';
import { FilesModule } from '../files/files.module';
import {
  Project,
  Episode,
  Sequence,
  Shot,
  Version,
  Asset,
  User,
  Status,
  Playlist,
  Note,
} from '../entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USERNAME || 'dev',
      password: process.env.DATABASE_PASSWORD || 'dev',
      database: process.env.DATABASE_NAME || 'shogun',
      entities: [Project, Episode, Sequence, Shot, Version, Asset, User, Status, Playlist, Note],
      synchronize: true, // Keep schema in sync with entities
      dropSchema: false, // NEVER drop schema - production safe
    }),
    TypeOrmModule.forFeature([
      Project,
      Episode,
      Sequence,
      Shot,
      Version,
      Asset,
      User,
      Status,
      Playlist,
      Note,
    ]),
    FilesModule,
  ],
  providers: [SeedService],
})
class SeedAppModule {}

async function createDatabaseIfNotExists() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USERNAME || 'dev',
    password: process.env.DATABASE_PASSWORD || 'dev',
    database: 'postgres', // Conectar a postgres para crear la base de datos
  });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = '${process.env.DATABASE_NAME || 'shogun'}'`,
    );

    if (result.rows.length === 0) {
      console.log('🗄️ Creating database shogun...');
      await client.query(`CREATE DATABASE "${process.env.DATABASE_NAME || 'shogun'}"`);
      console.log('✅ Database shogun created successfully!');
    } else {
      console.log('✅ Database shogun already exists');
    }
  } catch (error) {
    console.error('❌ Error creating database:', error);
  } finally {
    await client.end();
  }
}

async function bootstrap() {
  // Crear base de datos si no existe
  await createDatabaseIfNotExists();

  const app = await NestFactory.createApplicationContext(SeedAppModule);

  const seedService = app.get(SeedService);

  try {
    // Solo ejecutar seed en desarrollo
    const nodeEnv = process.env.NODE_ENV;
    console.log(`🔍 NODE_ENV: ${nodeEnv || 'undefined'}`);

    if (nodeEnv === 'development') {
      console.log('🌱 Running seed (development mode)...');
      await seedService.seed();
      console.log('✅ Seeding completed successfully!');
    } else {
      console.log('⚠️ Seed skipped - only available in development mode');
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }

  await app.close();
}

bootstrap();
