import { Injectable, Logger } from '@nestjs/common';
import { WebClient, Block, KnownBlock } from '@slack/web-api';
import { ConfigService } from '@nestjs/config';

/**
 * Slack Integration Service
 *
 * Sends notifications to Slack channels for important events.
 *
 * Features:
 * - Send messages to specific channels
 * - Rich message formatting with blocks
 * - Configurable per environment
 * - Graceful error handling
 *
 * Setup:
 * 1. Create Slack App: https://api.slack.com/apps
 * 2. Add Bot Token Scopes: chat:write, chat:write.public
 * 3. Install app to workspace
 * 4. Get Bot User OAuth Token
 * 5. Add to .env: SLACK_BOT_TOKEN=xoxb-your-token
 * 6. Add to .env: SLACK_DEFAULT_CHANNEL=#shogun-notifications
 *
 * Usage:
 * await slackService.sendNotification({
 *   channel: '#production-alerts',
 *   text: 'Version approved',
 *   blocks: [...]
 * });
 */

export interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: (Block | KnownBlock)[];
  threadTs?: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private client: WebClient | null = null;
  private defaultChannel: string;
  private enabled: boolean;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('SLACK_BOT_TOKEN');
    this.defaultChannel = this.configService.get<string>('SLACK_DEFAULT_CHANNEL') || '#shogun';
    this.enabled = this.configService.get<string>('SLACK_ENABLED') === 'true';

    if (token && this.enabled) {
      this.client = new WebClient(token);
      this.logger.log('Slack integration enabled');
    } else {
      this.logger.warn('Slack integration disabled (no token or SLACK_ENABLED=false)');
    }
  }

  /**
   * Send a notification to Slack
   */
  async sendNotification(message: SlackMessage): Promise<void> {
    if (!this.client || !this.enabled) {
      this.logger.debug('Slack disabled, skipping notification');
      return;
    }

    try {
      const channel = message.channel || this.defaultChannel;

      await this.client.chat.postMessage({
        channel,
        text: message.text,
        blocks: message.blocks,
        thread_ts: message.threadTs,
      });

      this.logger.log(`Slack notification sent to ${channel}`);
    } catch (error) {
      this.logger.error(`Failed to send Slack notification: ${error.message}`);
      // Don't throw - we don't want to fail the main operation if Slack is down
    }
  }

  /**
   * Send version approval notification
   */
  async notifyVersionApproved(
    versionCode: string,
    approvedBy: string,
    projectName: string,
  ): Promise<void> {
    await this.sendNotification({
      text: `✅ Version ${versionCode} approved by ${approvedBy}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Version Approved* ✅\n*Version:* ${versionCode}\n*Project:* ${projectName}\n*Approved by:* ${approvedBy}`,
          },
        },
      ],
    });
  }

  /**
   * Send version rejection notification
   */
  async notifyVersionRejected(
    versionCode: string,
    rejectedBy: string,
    reason: string,
  ): Promise<void> {
    await this.sendNotification({
      text: `❌ Version ${versionCode} rejected by ${rejectedBy}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Version Rejected* ❌\n*Version:* ${versionCode}\n*Rejected by:* ${rejectedBy}\n*Reason:* ${reason || 'No reason provided'}`,
          },
        },
      ],
    });
  }

  /**
   * Send production deployment notification
   */
  async notifyDeployment(environment: string, version: string, deployedBy: string): Promise<void> {
    await this.sendNotification({
      channel: '#deployments',
      text: `🚀 Deployed to ${environment}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Deployment* 🚀\n*Environment:* ${environment}\n*Version:* ${version}\n*Deployed by:* ${deployedBy}`,
          },
        },
      ],
    });
  }

  /**
   * Send security alert notification
   */
  async notifySecurityAlert(
    alertType: string,
    details: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
  ): Promise<void> {
    const emoji = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    }[severity];

    await this.sendNotification({
      channel: '#security-alerts',
      text: `${emoji} Security Alert: ${alertType}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Security Alert* ${emoji}\n*Type:* ${alertType}\n*Severity:* ${severity.toUpperCase()}\n*Details:* ${details}`,
          },
        },
      ],
    });
  }

  /**
   * Send failed login attempt notification
   */
  async notifyFailedLogin(username: string, ipAddress: string, attempts: number): Promise<void> {
    if (attempts >= 5) {
      await this.notifySecurityAlert(
        'Multiple Failed Login Attempts',
        `User: ${username}\nIP: ${ipAddress}\nAttempts: ${attempts}`,
        attempts >= 10 ? 'critical' : 'high',
      );
    }
  }

  /**
   * Send system error notification
   */
  async notifySystemError(error: string, context: string): Promise<void> {
    await this.sendNotification({
      channel: '#system-errors',
      text: `❗ System Error in ${context}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*System Error* ❗\n*Context:* ${context}\n*Error:* \`\`\`${error}\`\`\``,
          },
        },
      ],
    });
  }

  /**
   * Send project creation notification
   */
  async notifyProjectCreated(
    projectCode: string,
    projectName: string,
    createdBy: string,
  ): Promise<void> {
    await this.sendNotification({
      text: `🎬 New project created: ${projectName}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*New Project Created* 🎬\n*Code:* ${projectCode}\n*Name:* ${projectName}\n*Created by:* ${createdBy}`,
          },
        },
      ],
    });
  }

  /**
   * Send project completion notification
   */
  async notifyProjectCompleted(
    projectCode: string,
    projectName: string,
    completedBy: string,
  ): Promise<void> {
    await this.sendNotification({
      text: `🎉 Project completed: ${projectName}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Project Completed* 🎉\n*Code:* ${projectCode}\n*Name:* ${projectName}\n*Completed by:* ${completedBy}`,
          },
        },
      ],
    });
  }

  /**
   * Send admin user creation notification
   */
  async notifyAdminCreated(username: string, email: string, createdBy: string): Promise<void> {
    await this.sendNotification({
      channel: '#security-alerts',
      text: `👑 New admin user created: ${username}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*New Admin User* 👑\n*Username:* ${username}\n*Email:* ${email}\n*Created by:* ${createdBy}\n*Severity:* HIGH`,
          },
        },
      ],
    });
  }

  /**
   * Send user permissions change notification
   */
  async notifyPermissionsChanged(
    username: string,
    email: string,
    oldRole: string,
    newRole: string,
    changedBy: string,
  ): Promise<void> {
    const isElevation = this.isRoleElevation(oldRole, newRole);
    const emoji = isElevation ? '⬆️' : '⬇️';

    await this.sendNotification({
      channel: '#security-alerts',
      text: `${emoji} User permissions changed: ${username}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Permissions Changed* ${emoji}\n*User:* ${username} (${email})\n*Old Role:* ${oldRole}\n*New Role:* ${newRole}\n*Changed by:* ${changedBy}`,
          },
        },
      ],
    });
  }

  /**
   * Helper to determine if role change is an elevation
   */
  private isRoleElevation(oldRole: string, newRole: string): boolean {
    const hierarchy = { user: 0, lead: 1, supervisor: 2, admin: 3 };
    return (hierarchy[newRole.toLowerCase()] || 0) > (hierarchy[oldRole.toLowerCase()] || 0);
  }

  /**
   * Test Slack connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.client || !this.enabled) {
      return false;
    }

    try {
      await this.client.auth.test();
      this.logger.log('Slack connection test successful');
      return true;
    } catch (error) {
      this.logger.error(`Slack connection test failed: ${error.message}`);
      return false;
    }
  }
}
