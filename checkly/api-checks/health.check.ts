import { ApiCheck, AssertionBuilder } from 'checkly/constructs';

// Monitor #1: API Health Básico (60 min)
new ApiCheck('api-health-basic', {
  name: 'API Health - Basic',
  activated: true,
  frequency: 60,
  locations: ['eu-west-1'], // Ireland - closer to Madrid
  request: {
    method: 'GET',
    url: 'https://shogunapi.uliber.com/health',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(500),
    ],
  },
  tags: ['api', 'health', 'critical'],
});

// Monitor #2: API Health Completo (30 min)
new ApiCheck('api-health-complete', {
  name: 'API Health - Complete (Terminus)',
  activated: true,
  frequency: 30,
  locations: ['eu-west-1'], // Ireland - closer to Madrid
  request: {
    method: 'GET',
    url: 'https://shogunapi.uliber.com/api/v1/health',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(2000),
    ],
  },
  tags: ['api', 'health', 'database', 'critical'],
});

