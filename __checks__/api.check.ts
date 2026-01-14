import { ApiCheck, Frequency, AssertionBuilder } from 'checkly/constructs'

new ApiCheck('api-health-check', {
  name: 'Shogunito API Health',
  activated: true,
  frequency: Frequency.EVERY_12H,
  locations: ['eu-central-1', 'us-east-1'],
  request: {
    url: 'https://shogunitoapi.uliber.com/health',
    method: 'GET',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
    ],
  },
})
