import { ApiCheck, Frequency, AssertionBuilder } from 'checkly/constructs'

new ApiCheck('minio-health-check', {
  name: 'Shogunito MinIO S3 API',
  activated: true,
  frequency: Frequency.EVERY_12H,
  locations: ['eu-central-1', 'us-east-1'],
  request: {
    url: 'https://shogunitominio.uliber.com/minio/health/live',
    method: 'GET',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
    ],
  },
})
