import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('FROM_EMAIL') || 'noreply@orbic.app';
    
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not set. Email functionality will be disabled.');
      return;
    }

    this.resend = new Resend(apiKey);
    this.logger.log('Resend email service initialized');
  }

  async sendEmailVerification(email: string, code: string, displayName?: string): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn('Resend not initialized. Skipping email send.');
      return false;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `OrbicApp <${this.fromEmail}>`,
        to: [email],
        subject: 'Verify your email address - OrbicApp',
        html: this.getEmailVerificationTemplate(code, displayName || 'User'),
      });

      if (error) {
        this.logger.error('Failed to send email verification:', error);
        return false;
      }

      this.logger.log(`Email verification sent to ${email}. Message ID: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error('Error sending email verification:', error);
      return false;
    }
  }

  async sendPasswordReset(email: string, code: string, displayName?: string): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn('Resend not initialized. Skipping email send.');
      return false;
    }

    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/reset-password?code=${code}`;

      const { data, error } = await this.resend.emails.send({
        from: `OrbicApp <${this.fromEmail}>`,
        to: [email],
        subject: 'Reset your password - OrbicApp',
        html: this.getPasswordResetTemplate(resetUrl, displayName || 'User'),
      });

      if (error) {
        this.logger.error('Failed to send password reset email:', error);
        return false;
      }

      this.logger.log(`Password reset email sent to ${email}. Message ID: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error('Error sending password reset email:', error);
      return false;
    }
  }

  private getEmailVerificationTemplate(code: string, displayName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email - OrbicApp</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #6366f1;
              margin-bottom: 10px;
            }
            .code {
              background: #f3f4f6;
              border: 2px dashed #d1d5db;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
            }
            .code-text {
              font-size: 32px;
              font-weight: bold;
              color: #1f2937;
              letter-spacing: 4px;
              font-family: 'Courier New', monospace;
            }
            .button {
              display: inline-block;
              background: #6366f1;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              margin: 20px 0;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎓 OrbicApp</div>
              <h1>Verify your email address</h1>
            </div>
            
            <p>Hi ${displayName},</p>
            
            <p>Welcome to OrbicApp! To complete your registration and start creating amazing gamified learning experiences, please verify your email address.</p>
            
            <p>Enter this verification code in the app:</p>
            
            <div class="code">
              <div class="code-text">${code}</div>
            </div>
            
            <p>This code will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't create an account with OrbicApp, you can safely ignore this email.</p>
            
            <div class="footer">
              <p>© 2025 OrbicApp. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetTemplate(resetUrl: string, displayName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your password - OrbicApp</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #6366f1;
              margin-bottom: 10px;
            }
            .button {
              display: inline-block;
              background: #6366f1;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background: #5856eb;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
              text-align: center;
            }
            .warning {
              background: #fef3cd;
              border: 1px solid #fde68a;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
              color: #92400e;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎓 OrbicApp</div>
              <h1>Reset your password</h1>
            </div>
            
            <p>Hi ${displayName},</p>
            
            <p>We received a request to reset your password for your OrbicApp account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6366f1;">${resetUrl}</p>
            
            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 1 hour for security reasons. If you didn't request a password reset, you can safely ignore this email.
            </div>
            
            <p>If you're having trouble with the button above, copy and paste the URL into your web browser.</p>
            
            <div class="footer">
              <p>© 2025 OrbicApp. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}