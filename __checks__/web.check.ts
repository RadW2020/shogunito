import { ApiCheck, Frequency, AssertionBuilder } from 'checkly/constructs'

new ApiCheck('web-health-check', {
  name: 'Shogunito Web UI',
  activated: true,
  frequency: Frequency.EVERY_12H,
  locations: ['eu-central-1', 'us-east-1'],
  request: {
    url: 'https://shogunitoweb.uliber.com',
    method: 'GET',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
    ],
  },
})
