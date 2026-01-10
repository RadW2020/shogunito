import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SlackService } from './slack.service';
import { WebClient } from '@slack/web-api';

// Mock de @slack/web-api
jest.mock('@slack/web-api');

describe('SlackService', () => {
  let service: SlackService;
  let mockWebClient: jest.Mocked<WebClient>;

  beforeEach(async () => {
    // Limpiar mocks
    jest.clearAllMocks();

    // Mock del WebClient
    mockWebClient = {
      chat: {
        postMessage: jest.fn().mockResolvedValue({ ok: true }),
      },
      auth: {
        test: jest.fn().mockResolvedValue({ ok: true }),
      },
    } as any;

    (WebClient as jest.MockedClass<typeof WebClient>).mockImplementation(() => mockWebClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                SLACK_BOT_TOKEN: 'xoxb-test-token',
                SLACK_DEFAULT_CHANNEL: '#test-channel',
                SLACK_ENABLED: 'true',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SlackService>(SlackService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize WebClient when token and enabled are provided', () => {
      expect(WebClient).toHaveBeenCalledWith('xoxb-test-token');
    });

    it('should not initialize WebClient when token is missing', async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SlackService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                return key === 'SLACK_ENABLED' ? 'true' : undefined;
              }),
            },
          },
        ],
      }).compile();

      const serviceWithoutToken = module.get<SlackService>(SlackService);
      expect(serviceWithoutToken).toBeDefined();
      // WebClient no debería haberse creado
    });

    it('should not initialize WebClient when SLACK_ENABLED is false', async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SlackService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                const config = {
                  SLACK_BOT_TOKEN: 'xoxb-test-token',
                  SLACK_DEFAULT_CHANNEL: '#test',
                  SLACK_ENABLED: 'false',
                };
                return config[key];
              }),
            },
          },
        ],
      }).compile();

      const disabledService = module.get<SlackService>(SlackService);
      expect(disabledService).toBeDefined();
    });

    it('should use default channel when SLACK_DEFAULT_CHANNEL is not provided', async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SlackService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                return key === 'SLACK_BOT_TOKEN' ? 'xoxb-test-token' : undefined;
              }),
            },
          },
        ],
      }).compile();

      const serviceWithDefaultChannel = module.get<SlackService>(SlackService);
      expect(serviceWithDefaultChannel).toBeDefined();
    });
  });

  describe('sendNotification', () => {
    it('should send a notification with default channel', async () => {
      await service.sendNotification({
        text: 'Test message',
      });

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: '#test-channel',
        text: 'Test message',
        blocks: undefined,
        thread_ts: undefined,
      });
    });

    it('should send a notification with custom channel', async () => {
      await service.sendNotification({
        channel: '#custom-channel',
        text: 'Test message',
      });

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: '#custom-channel',
        text: 'Test message',
        blocks: undefined,
        thread_ts: undefined,
      });
    });

    it('should send a notification with blocks', async () => {
      const blocks = [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '*Bold text*' },
        },
      ];

      await service.sendNotification({
        text: 'Test message',
        blocks,
      });

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: '#test-channel',
        text: 'Test message',
        blocks,
        thread_ts: undefined,
      });
    });

    it('should send a notification in a thread', async () => {
      await service.sendNotification({
        text: 'Reply message',
        threadTs: '1234567890.123456',
      });

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: '#test-channel',
        text: 'Reply message',
        blocks: undefined,
        thread_ts: '1234567890.123456',
      });
    });

    it('should not send notification when client is not initialized', async () => {
      // Create service without token
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SlackService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const disabledService = module.get<SlackService>(SlackService);

      await disabledService.sendNotification({ text: 'Test' });

      expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (mockWebClient.chat.postMessage as jest.Mock).mockRejectedValueOnce(
        new Error('Slack API error'),
      );

      // Should not throw
      await expect(service.sendNotification({ text: 'Test' })).resolves.not.toThrow();
    });
  });

  describe('notifyVersionApproved', () => {
    it('should send version approved notification', async () => {
      await service.notifyVersionApproved('V001', 'John Doe', 'My Project');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '✅ Version V001 approved by John Doe',
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: 'section',
              text: expect.objectContaining({
                text: expect.stringContaining('*Version Approved*'),
              }),
            }),
          ]),
        }),
      );
    });

    it('should include all version details in blocks', async () => {
      await service.notifyVersionApproved('V002', 'Jane Smith', 'Test Project');

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.blocks[0].text.text).toContain('V002');
      expect(call.blocks[0].text.text).toContain('Jane Smith');
      expect(call.blocks[0].text.text).toContain('Test Project');
    });
  });

  describe('notifyVersionRejected', () => {
    it('should send version rejected notification with reason', async () => {
      await service.notifyVersionRejected('V001', 'John Doe', 'Quality issues');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '❌ Version V001 rejected by John Doe',
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: 'section',
              text: expect.objectContaining({
                text: expect.stringContaining('Quality issues'),
              }),
            }),
          ]),
        }),
      );
    });

    it('should handle missing reason', async () => {
      await service.notifyVersionRejected('V002', 'Jane Smith', '');

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.blocks[0].text.text).toContain('No reason provided');
    });
  });

  describe('notifyDeployment', () => {
    it('should send deployment notification to #deployments channel', async () => {
      await service.notifyDeployment('production', 'v1.2.3', 'DevOps Team');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: '#deployments',
          text: '🚀 Deployed to production',
        }),
      );
    });

    it('should include deployment details', async () => {
      await service.notifyDeployment('staging', 'v2.0.0', 'CI/CD');

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.blocks[0].text.text).toContain('staging');
      expect(call.blocks[0].text.text).toContain('v2.0.0');
      expect(call.blocks[0].text.text).toContain('CI/CD');
    });
  });

  describe('notifySecurityAlert', () => {
    it('should send low severity security alert', async () => {
      await service.notifySecurityAlert(
        'Suspicious Activity',
        'User attempted unusual action',
        'low',
      );

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.channel).toBe('#security-alerts');
      expect(call.text).toContain('🔵');
      expect(call.blocks[0].text.text).toContain('LOW');
    });

    it('should send medium severity security alert', async () => {
      await service.notifySecurityAlert('Invalid Token', 'Details here', 'medium');

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.text).toContain('🟡');
      expect(call.blocks[0].text.text).toContain('MEDIUM');
    });

    it('should send high severity security alert', async () => {
      await service.notifySecurityAlert('Brute Force', 'Details here', 'high');

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.text).toContain('🟠');
      expect(call.blocks[0].text.text).toContain('HIGH');
    });

    it('should send critical severity security alert', async () => {
      await service.notifySecurityAlert('Data Breach', 'Details here', 'critical');

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.text).toContain('🔴');
      expect(call.blocks[0].text.text).toContain('CRITICAL');
    });
  });

  describe('notifyFailedLogin', () => {
    it('should not notify for less than 5 attempts', async () => {
      await service.notifyFailedLogin('user@example.com', '192.168.1.1', 4);

      expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
    });

    it('should notify with high severity for 5-9 attempts', async () => {
      await service.notifyFailedLogin('user@example.com', '192.168.1.1', 5);

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.channel).toBe('#security-alerts');
      expect(call.blocks[0].text.text).toContain('HIGH');
      expect(call.blocks[0].text.text).toContain('user@example.com');
      expect(call.blocks[0].text.text).toContain('192.168.1.1');
    });

    it('should notify with critical severity for 10+ attempts', async () => {
      await service.notifyFailedLogin('user@example.com', '192.168.1.1', 10);

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.blocks[0].text.text).toContain('CRITICAL');
    });
  });

  describe('notifySystemError', () => {
    it('should send system error notification', async () => {
      await service.notifySystemError('Database connection failed', 'UserService');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: '#system-errors',
          text: '❗ System Error in UserService',
        }),
      );
    });

    it('should include error details in code block', async () => {
      await service.notifySystemError('Stack trace here', 'PaymentService');

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.blocks[0].text.text).toContain('```Stack trace here```');
    });
  });

  describe('notifyProjectCreated', () => {
    it('should send project created notification', async () => {
      await service.notifyProjectCreated('PROJ001', 'My Project', 'John Doe');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '🎬 New project created: My Project',
        }),
      );

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.blocks[0].text.text).toContain('PROJ001');
      expect(call.blocks[0].text.text).toContain('John Doe');
    });
  });

  describe('notifyProjectCompleted', () => {
    it('should send project completed notification', async () => {
      await service.notifyProjectCompleted('PROJ001', 'My Project', 'Jane Smith');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '🎉 Project completed: My Project',
        }),
      );
    });
  });

  describe('notifyAdminCreated', () => {
    it('should send admin created notification to security channel', async () => {
      await service.notifyAdminCreated('admin_user', 'admin@example.com', 'superadmin');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: '#security-alerts',
          text: '👑 New admin user created: admin_user',
        }),
      );

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.blocks[0].text.text).toContain('admin@example.com');
      expect(call.blocks[0].text.text).toContain('superadmin');
      expect(call.blocks[0].text.text).toContain('HIGH');
    });
  });

  describe('notifyPermissionsChanged', () => {
    it('should send notification for role elevation', async () => {
      await service.notifyPermissionsChanged(
        'user123',
        'user@example.com',
        'user',
        'admin',
        'superadmin',
      );

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.channel).toBe('#security-alerts');
      expect(call.text).toContain('⬆️'); // Elevation arrow
      expect(call.blocks[0].text.text).toContain('user');
      expect(call.blocks[0].text.text).toContain('admin');
    });

    it('should send notification for role demotion', async () => {
      await service.notifyPermissionsChanged(
        'user123',
        'user@example.com',
        'admin',
        'user',
        'superadmin',
      );

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.text).toContain('⬇️'); // Demotion arrow
    });

    it('should handle lateral role changes', async () => {
      await service.notifyPermissionsChanged(
        'user123',
        'user@example.com',
        'lead',
        'lead',
        'admin',
      );

      // Should still send notification
      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });

    it('should handle unknown roles as elevation', async () => {
      await service.notifyPermissionsChanged(
        'user123',
        'user@example.com',
        'unknown_role',
        'admin',
        'system',
      );

      const call = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(call.text).toContain('⬆️');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection test', async () => {
      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockWebClient.auth.test).toHaveBeenCalled();
    });

    it('should return false when client is not initialized', async () => {
      // Create service without token
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SlackService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const disabledService = module.get<SlackService>(SlackService);
      const result = await disabledService.testConnection();

      expect(result).toBe(false);
    });

    it('should return false on connection error', async () => {
      (mockWebClient.auth.test as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings gracefully', async () => {
      await service.notifyVersionApproved('', '', '');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000);

      await service.sendNotification({ text: longMessage });

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: longMessage,
        }),
      );
    });

    it('should handle special characters in messages', async () => {
      const specialChars = '<>&"\'`@#$%^&*()';

      await service.sendNotification({ text: specialChars });

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: specialChars,
        }),
      );
    });

    it('should handle concurrent notifications', async () => {
      const promises = [
        service.sendNotification({ text: 'Message 1' }),
        service.sendNotification({ text: 'Message 2' }),
        service.sendNotification({ text: 'Message 3' }),
      ];

      await Promise.all(promises);

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledTimes(3);
    });
  });
});
