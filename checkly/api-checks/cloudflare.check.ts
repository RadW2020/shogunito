import { ApiCheck, AssertionBuilder } from 'checkly/constructs';

// ============================================
// Cloudflare Tunnel Monitors
// ============================================
// These checks serve two purposes:
// 1. Monitor availability and response times
// 2. Keep the QUIC tunnel connections alive by generating regular traffic
//
// Using eu-west-1 (Ireland) to route through European Cloudflare edges
// which are closer to Madrid where our tunnel connects

// Monitor #3: Cloudflare Tunnel - API (15 min from Europe)
// Regular frequency to keep QUIC tunnel connections alive and prevent timeouts
new ApiCheck('cf-tunnel-api', {
  name: 'Cloudflare Tunnel - API',
  activated: true,
  frequency: 15, // Every 15 min - balance between keepalive and quota
  locations: ['eu-west-1'], // Ireland - closer to Madrid edges
  request: {
    method: 'GET',
    url: 'https://shogunapi.uliber.com/health',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(2000),
    ],
  },
  tags: ['cloudflare', 'tunnel', 'critical', 'keepalive'],
});

// Monitor #5: Cloudflare Tunnel - Frontend (15 min from Europe)
new ApiCheck('cf-tunnel-frontend', {
  name: 'Cloudflare Tunnel - Frontend',
  activated: true,
  frequency: 15, // Every 15 min - balance between keepalive and quota
  locations: ['eu-west-1'], // Ireland - closer to Madrid edges
  request: {
    method: 'GET', // Changed from HEAD to GET for better keepalive
    url: 'https://shogunweb.uliber.com',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(3000),
    ],
  },
  tags: ['cloudflare', 'tunnel', 'frontend', 'critical', 'keepalive'],
});

// Monitor #10: Cloudflare Tunnel - MinIO (30 min)
new ApiCheck('minio-health', {
  name: 'Cloudflare Tunnel - MinIO',
  activated: true,
  frequency: 30,
  locations: ['eu-west-1'], // Ireland
  request: {
    method: 'GET',
    url: 'https://shogunminio.uliber.com/minio/health/live',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(2000),
    ],
  },
  tags: ['minio', 'storage', 'cloudflare'],
});

