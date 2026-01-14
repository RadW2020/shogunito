import { ApiCheck, Frequency, AssertionBuilder } from 'checkly/constructs'

new ApiCheck('api-docs-check', {
  name: 'Shogunito API Swagger JSON',
  activated: true,
  frequency: Frequency.EVERY_12H,
  locations: ['eu-central-1', 'us-east-1'],
  request: {
    url: 'https://shogunitoapi.uliber.com/api/v1/docs-json',
    method: 'GET',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody('info.title').contains('Shogunito API'),
    ],
  },
})
