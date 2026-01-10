import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Health Check Controller
 *
 * Provides health check endpoints for monitoring and orchestration.
 *
 * Endpoints:
 * - GET /health - Overall application health
 * - GET /health/db - Database health
 * - GET /health/ready - Readiness probe (Kubernetes)
 * - GET /health/live - Liveness probe (Kubernetes)
 *
 * These endpoints are typically used by:
 * - Load balancers
 * - Kubernetes/Docker orchestration
 * - Monitoring systems (Datadog, New Relic, etc.)
 * - CI/CD pipelines
 *
 * @example
 * // Check overall health
 * GET /health
 * Response: { status: 'ok', info: { database: { status: 'up' } } }
 *
 * // Kubernetes readiness probe
 * livenessProbe:
 *   httpGet:
 *     path: /health/live
 *     port: 3000
 *   initialDelaySeconds: 30
 *   periodSeconds: 10
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Overall application health',
    description: `
    Returns comprehensive health status of the application including:
    - Database connectivity
    - Memory usage
    - Disk usage

    Used by monitoring systems and load balancers to determine service health.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ok', 'error', 'shutting_down'],
          example: 'ok',
        },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            memory_rss: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            storage: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
        error: {
          type: 'object',
          description: 'Contains error details if any check fails',
        },
        details: {
          type: 'object',
          description: 'Detailed information about all checks',
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is unhealthy - one or more checks failed',
  })
  check() {
    return this.health.check([
      // Check database connection
      () => this.db.pingCheck('database', { timeout: 3000 }),

      // Check memory heap doesn't exceed 150MB
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),

      // Check RSS memory doesn't exceed 300MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),

      // Check disk storage (90% threshold)
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  @Public()
  @Get('db')
  @HealthCheck()
  @ApiOperation({
    summary: 'Database health check',
    description: 'Checks if the database is reachable and responsive',
  })
  @ApiResponse({
    status: 200,
    description: 'Database is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Database is unreachable',
  })
  checkDatabase() {
    return this.health.check([() => this.db.pingCheck('database', { timeout: 3000 })]);
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe (Kubernetes)',
    description: `
    Indicates whether the application is ready to accept traffic.

    Returns 200 if the application is ready, 503 otherwise.

    Use in Kubernetes readinessProbe:
    \`\`\`yaml
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 5
    \`\`\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to accept traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready yet',
  })
  checkReadiness() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
    ]);
  }

  @Public()
  @Get('live')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe (Kubernetes)',
    description: `
    Indicates whether the application is alive and running.

    Returns 200 if the application is alive, 503 if it should be restarted.

    Use in Kubernetes livenessProbe:
    \`\`\`yaml
    livenessProbe:
      httpGet:
        path: /health/live
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
    \`\`\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  @ApiResponse({
    status: 503,
    description: 'Application should be restarted',
  })
  checkLiveness() {
    // Simple liveness check - just checks if the app can respond
    // If this fails, Kubernetes will restart the container
    return this.health.check([() => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024)]);
  }
}
