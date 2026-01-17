import { ApiCheck, Frequency, AssertionBuilder } from 'checkly/constructs'

/**
 * Oracle Free Tier Monitor Check
 * 
 * This check monitors the Oracle Free Tier instance health.
 * 
 * IMPORTANT: The API key is stored as an environment variable in Checkly.
 * To set it up:
 * 1. Go to https://app.checklyhq.com/
 * 2. Navigate to your project settings
 * 3. Add an environment variable: ORACLE_MONITOR_API_KEY
 * 4. Deploy this check with: npx checkly deploy
 */
new ApiCheck('oracle-monitor-check', {
  name: 'Oracle Free Tier Monitor',
  activated: true,
  frequency: Frequency.EVERY_12H,
  locations: ['eu-central-1'],
  request: {
    url: 'http://xs0w4oc0kww8skoo4wksk48w.80.225.189.40.sslip.io/status',
    method: 'GET',
    headers: [
      {
        key: 'X-API-Key',
        // This references an environment variable in Checkly
        // The actual value should be set in Checkly dashboard
        value: '{{ORACLE_MONITOR_API_KEY}}',
      },
    ],
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody('$.maxUsagePercentage').lessThan(101),
    ],
  },
  retryStrategy: {
    type: 'FIXED',
    maxRetries: 2,
    sameRegion: true,
    baseBackoffSeconds: 30,
  },
})
