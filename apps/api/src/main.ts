import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, ClassSerializerInterceptor, VersioningType } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { SanitizationPipe } from './common/pipes/sanitization.pipe';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // TEMPORARY: Log environment variables for debugging
  console.log('\n🔍 ============================================');
  console.log('🔍 ENVIRONMENT VARIABLES DEBUG (TEMPORARY)');
  console.log('🔍 ============================================');

  const sensitiveKeys = ['SECRET', 'PASSWORD', 'TOKEN', 'KEY'];
  const envVars = {
    // Database
    DATABASE_HOST: configService.get<string>('DATABASE_HOST'),
    DATABASE_PORT: configService.get<string>('DATABASE_PORT'),
    DATABASE_USERNAME: configService.get<string>('DATABASE_USERNAME'),
    DATABASE_PASSWORD: configService.get<string>('DATABASE_PASSWORD'),
    DATABASE_NAME: configService.get<string>('DATABASE_NAME'),
    // Application
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    // CORS
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    FRONTEND_URL: process.env.FRONTEND_URL,
    // JWT
    JWT_SECRET: configService.get<string>('JWT_SECRET'),
    JWT_EXPIRES_IN: configService.get<string>('JWT_EXPIRES_IN'),
    JWT_REFRESH_SECRET: configService.get<string>('JWT_REFRESH_SECRET'),
    JWT_REFRESH_EXPIRES_IN: configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    // MinIO
    MINIO_ENDPOINT: configService.get<string>('MINIO_ENDPOINT'),
    MINIO_PORT: configService.get<string>('MINIO_PORT'),
    MINIO_USE_SSL: configService.get<string>('MINIO_USE_SSL'),
    MINIO_ACCESS_KEY: configService.get<string>('MINIO_ACCESS_KEY'),
    MINIO_SECRET_KEY: configService.get<string>('MINIO_SECRET_KEY'),
    // Email
    EMAIL_FROM_EMAIL: configService.get<string>('EMAIL_FROM_EMAIL'),
    EMAIL_FROM_NAME: configService.get<string>('EMAIL_FROM_NAME'),
    // Axiom
    AXIOM_ENABLED: configService.get<string>('AXIOM_ENABLED'),
    AXIOM_API_TOKEN: configService.get<string>('AXIOM_API_TOKEN'),
    AXIOM_ORG_ID: configService.get<string>('AXIOM_ORG_ID'),
    AXIOM_DATASET: configService.get<string>('AXIOM_DATASET'),
    // Log Retention
    LOG_RETENTION_ENABLED: configService.get<string>('LOG_RETENTION_ENABLED'),
  };

  const defaultValues = [
    'CHANGE_THIS',
    'your-secret-key',
    'CHANGE_THIS_STRONG_PASSWORD',
    'CHANGE_THIS_ACCESS_KEY',
    'CHANGE_THIS_SECRET_KEY',
  ];
  const warnings: string[] = [];

  Object.entries(envVars).forEach(([key, value]) => {
    const isSensitive = sensitiveKeys.some((sk) => key.toUpperCase().includes(sk));
    let displayValue: string;

    if (value === undefined || value === null) {
      displayValue = '❌ NOT SET';
      warnings.push(`${key} is not set`);
    } else if (defaultValues.some((dv) => value.includes(dv))) {
      displayValue = `⚠️  DEFAULT VALUE: ${isSensitive ? '***' : value}`;
      warnings.push(`${key} is using default/placeholder value`);
    } else if (isSensitive && value.length > 8) {
      // Show first 4 and last 4 characters for sensitive values
      displayValue = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    } else if (isSensitive) {
      displayValue = '***';
    } else {
      displayValue = value;
    }

    console.log(`   ${key}: ${displayValue}`);
  });

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach((warning) => console.log(`   - ${warning}`));
    console.log(
      '\n💡 TIP: Use ./scripts/deploy-production.sh to load variables from .env.production',
    );
  }

  console.log('🔍 ============================================\n');

  // Log TypeORM configuration in test environment for debugging
  if (process.env.NODE_ENV === 'test') {
    console.log('\n🔍 TypeORM Configuration (Test Environment):');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   DATABASE_HOST: ${configService.get<string>('DATABASE_HOST')}`);
    console.log(`   DATABASE_PORT: ${configService.get<string>('DATABASE_PORT')}`);
    console.log(`   DATABASE_NAME: ${configService.get<string>('DATABASE_NAME')}`);
    console.log(`   Synchronize: true (should auto-create tables)`);
    console.log(`   Drop Schema: false (prevents race conditions)`);
    console.log('🔍 ============================================\n');
  }

  // Validate JWT secrets in production to prevent session invalidation
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret = configService.get<string>('JWT_REFRESH_SECRET');

    const defaultSecrets = ['your-secret-key', 'CHANGE_THIS', 'dev-secret-change-in-production'];

    if (!jwtSecret || defaultSecrets.includes(jwtSecret)) {
      console.error('⚠️  CRITICAL: JWT_SECRET is not properly configured!');
      console.error('   This will cause all existing user sessions to be invalidated.');
      console.error('   Please set JWT_SECRET in .env.production file.');
      process.exit(1);
    }

    if (!jwtRefreshSecret || defaultSecrets.includes(jwtRefreshSecret)) {
      console.error('⚠️  CRITICAL: JWT_REFRESH_SECRET is not properly configured!');
      console.error('   This will cause all existing user sessions to be invalidated.');
      console.error('   Please set JWT_REFRESH_SECRET in .env.production file.');
      process.exit(1);
    }

    console.log('✅ JWT secrets validated - user sessions will be preserved');
  }

  // Handle root route before versioning
  app.use((req, res, next) => {
    if (req.path === '/' && req.method === 'GET') {
      return res.json({
        success: true,
        data: 'API is running',
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    }
    if (req.path === '/health' && (req.method === 'GET' || req.method === 'HEAD')) {
      const response = {
        success: true,
        data: {
          status: 'ok',
          timestamp: new Date().toISOString(),
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
      // For HEAD requests, only send headers (no body)
      if (req.method === 'HEAD') {
        res.set('Content-Type', 'application/json');
        return res.status(200).end();
      }
      return res.json(response);
    }
    next();
  });

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Configurar ValidationPipe primero para validar antes de sanitizar
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      skipMissingProperties: false, // Validate missing required fields
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // Configurar SanitizationPipe después de la validación para prevenir XSS y SQL injection
  app.useGlobalPipes(new SanitizationPipe());

  // Configurar interceptores globales
  app.useGlobalInterceptors(
    // ClassSerializerInterceptor para excluir campos sensibles
    new ClassSerializerInterceptor(app.get(Reflector)),
    // TransformResponseInterceptor para formatear respuestas con ApiResponse
    new TransformResponseInterceptor(),
  );

  // Configurar filtro de excepciones global con formato ApiResponse
  app.useGlobalFilters(new HttpExceptionFilter());

  // Implementar CORS más restrictivo en producción
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600, // Cache preflight requests for 1 hour
    optionsSuccessStatus: 204, // Return 204 for OPTIONS requests
  });

  // Log CORS configuration in development/test
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔒 CORS configured for origins:', allowedOrigins);
  }

  // Configuración de Swagger v1 - Incluye configuración de Bearer Auth
  const configV1 = new DocumentBuilder()
    .setTitle('Shogun API v1')
    .setDescription(
      'API REST para el sistema de gestión de proyectos multimedia Shogun - Version 1',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('/api/v1', 'API v1')
    .build();

  const documentV1 = SwaggerModule.createDocument(app, configV1, {
    include: [],
    deepScanRoutes: true,
  });
  SwaggerModule.setup('api/v1/docs', app, documentV1);

  // Verify TypeORM connection and schema in test environment
  if (process.env.NODE_ENV === 'test') {
    try {
      const dataSource = app.get(DataSource);
      if (dataSource.isInitialized) {
        console.log('\n✅ TypeORM DataSource initialized successfully');
        // Verify that users table exists (or will be created by synchronize)
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        const tables = await queryRunner.getTables();
        const hasUsersTable = tables.some((table) => table.name === 'users');
        if (hasUsersTable) {
          console.log('✅ Users table exists');
        } else {
          console.log('⚠️  Users table does not exist yet (synchronize should create it)');
        }
        await queryRunner.release();
      } else {
        console.log('⚠️  TypeORM DataSource not initialized yet');
      }
    } catch (error) {
      console.error('❌ Error verifying TypeORM connection:', error);
    }
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API running on http://0.0.0.0:${port}`);
  console.log(`📚 API v1 documentation: http://localhost:${port}/api/v1/docs`);
  console.log('🔗 Base URL:');
  console.log(`   - v1: http://localhost:${port}/api/v1/`);
}
bootstrap();
