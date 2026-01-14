import { ApiCheck, Frequency, AssertionBuilder } from 'checkly/constructs'

new ApiCheck('coolify-panel-check', {
  name: 'Coolify Control Panel',
  activated: true,
  frequency: Frequency.EVERY_12H,
  locations: ['eu-central-1'],
  request: {
    url: 'https://cool.uliber.com',
    method: 'GET',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
    ],
  },
})
