import { ApiCheck, AssertionBuilder } from 'checkly/constructs';

// Monitor #6: Authentication - Login (120 min)
// Verifica que el login con email/password funciona correctamente
new ApiCheck('auth-login', {
  name: 'Authentication - Login',
  activated: true,
  frequency: 120,
  locations: ['eu-west-1'], // Ireland - closer to Madrid
  request: {
    method: 'POST',
    url: 'https://shogunapi.uliber.com/api/v1/auth/login',
    headers: [{ key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({
      email: '{{CHECKLY_TEST_USER_EMAIL}}',
      password: '{{CHECKLY_TEST_USER_PASSWORD}}',
    }),
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(2000),
    ],
  },
  tags: ['auth', 'login', 'important'],
});

