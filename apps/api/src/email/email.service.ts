import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('EMAIL_FROM_EMAIL') || 'noreply@shogunito.com';
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'Shogunito';
  }

  /**
   * Enviar email de recuperación de contraseña
   */
  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<boolean> {
    const resetUrl = this.configService.get<string>('PASSWORD_RESET_URL');
    const resetLink = `${resetUrl}?token=${resetToken}`;

    const emailData = {
      subject: 'Recuperación de contraseña - Shogunito',
      from: {
        name: this.fromName,
        email: this.fromEmail,
      },
      to: [
        {
          name,
          email,
        },
      ],
      html: this.getPasswordResetTemplate(name, resetLink),
      text: `Hola ${name},\n\nHas solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:\n\n${resetLink}\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste este cambio, ignora este mensaje.\n\nSaludos,\nEquipo Shogunito`,
    };

    return Promise.resolve(this.sendEmail(emailData));
  }

  /**
   * Send email (currently disabled - stub implementation)
   */
  private sendEmail(emailData: {
    subject: string;
    to: Array<{ name: string; email: string }>;
    html: string;
    text: string;
  }): boolean {
    this.logger.warn(
      `Email sending is disabled. Would send email to ${emailData.to[0].email} with subject: ${emailData.subject}`,
    );
    return false;
  }

  /**
   * Template HTML para email de recuperación de contraseña
   */
  private getPasswordResetTemplate(name: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperación de Contraseña</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #1a1a1a;
      margin: 0;
      font-size: 28px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #007bff;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #0056b3;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .link-alt {
      word-break: break-all;
      color: #007bff;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🎬 SHOGUNITO</h1>
    </div>

    <div class="content">
      <h2>Hola ${name},</h2>
      <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>

      <div style="text-align: center;">
        <a href="${resetLink}" class="button">Restablecer Contraseña</a>
      </div>

      <p style="font-size: 14px; color: #666;">
        Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
      </p>
      <p class="link-alt">${resetLink}</p>
    </div>

    <div class="warning">
      <strong>⏱️ Este enlace expirará en 1 hora.</strong>
    </div>

    <div class="footer">
      <p>Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
      <p>Por seguridad, nunca compartas este enlace con nadie.</p>
      <p style="margin-top: 20px;">
        <strong>Equipo Shogunito</strong>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Enviar email de confirmación de cambio de contraseña
   */
  async sendPasswordChangedEmail(email: string, name: string): Promise<boolean> {
    const emailData = {
      subject: 'Tu contraseña ha sido actualizada - Shogunito',
      from: {
        name: this.fromName,
        email: this.fromEmail,
      },
      to: [
        {
          name,
          email,
        },
      ],
      html: this.getPasswordChangedTemplate(name),
      text: `Hola ${name},\n\nTu contraseña ha sido actualizada exitosamente.\n\nSi no realizaste este cambio, contacta inmediatamente con soporte.\n\nSaludos,\nEquipo Shogunito`,
    };

    return Promise.resolve(this.sendEmail(emailData));
  }

  /**
   * Template HTML para confirmación de cambio de contraseña
   */
  private getPasswordChangedTemplate(name: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contraseña Actualizada</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #1a1a1a;
      margin: 0;
      font-size: 28px;
    }
    .success-icon {
      text-align: center;
      font-size: 48px;
      margin: 20px 0;
    }
    .content {
      margin-bottom: 30px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }
    .alert {
      background-color: #d1ecf1;
      border-left: 4px solid #0c5460;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
      color: #0c5460;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🎬 SHOGUNITO</h1>
    </div>

    <div class="success-icon">✅</div>

    <div class="content">
      <h2>Hola ${name},</h2>
      <p>Te confirmamos que tu contraseña ha sido actualizada exitosamente.</p>
      <p>Ahora puedes iniciar sesión con tu nueva contraseña.</p>
    </div>

    <div class="alert">
      <strong>⚠️ ¿No fuiste tú?</strong><br>
      Si no realizaste este cambio, contacta inmediatamente con nuestro equipo de soporte.
    </div>

    <div class="footer">
      <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
      <p style="margin-top: 20px;">
        <strong>Equipo Shogunito</strong>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
