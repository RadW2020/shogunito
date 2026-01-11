const { DataSource } = require('typeorm');
const { join } = require('path');
const { config } = require('dotenv');

// Load environment variables
config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

/**
 * TypeORM configuration for migrations
 *
 * Usage:
 * - Generate migration: npm run migration:generate -- migrations/MigrationName
 * - Run migrations: npm run migration:run
 * - Revert migration: npm run migration:revert
 */
const dataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'dev',
  password: process.env.DATABASE_PASSWORD || 'dev',
  database: process.env.DATABASE_NAME || 'shogunito',
  entities: [join(__dirname, '..', 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
};

// Export DataSource for TypeORM CLI
const dataSource = new DataSource(dataSourceOptions);
module.exports = dataSource;
