import { ApiCheck, AssertionBuilder } from 'checkly/constructs';

// Monitor #9: Swagger Docs (180 min)
new ApiCheck('swagger-docs', {
  name: 'Swagger Documentation',
  activated: true,
  frequency: 180,
  locations: ['eu-west-1'], // Ireland - closer to Madrid
  request: {
    method: 'GET',
    url: 'https://shogunapi.uliber.com/api/v1/docs',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(5000),
    ],
  },
  tags: ['docs', 'swagger', 'informative'],
});

