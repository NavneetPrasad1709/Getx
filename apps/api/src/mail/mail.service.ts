import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;
  private readonly from: string;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.from =
      config.get<string>('RESEND_FROM_EMAIL') || 'GETX <noreply@getx.gg>';

    if (apiKey && apiKey.startsWith('re_')) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service initialized');
    } else {
      this.logger.warn(
        'RESEND_API_KEY not configured — emails will log to console.',
      );
    }
  }

  async sendVerificationOtp(
    email: string,
    name: string,
    otp: string,
  ): Promise<void> {
    const subject = 'Verify your GETX account';
    const safeName = this.escapeHtml(name);
    const safeOtp = this.escapeHtml(otp);
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fafbfc;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:12px;padding:40px;">
    <h1 style="color:#2563eb;margin:0 0 16px;font-size:32px;">Welcome, ${safeName}!</h1>
    <p style="color:#475569;font-size:16px;line-height:1.5;margin:0 0 24px;">Your GETX verification code:</p>
    <div style="background:#f0f9ff;border:2px solid #2563eb;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <div style="font-size:42px;font-weight:bold;color:#2563eb;letter-spacing:12px;font-family:monospace;">${safeOtp}</div>
    </div>
    <p style="color:#64748b;font-size:14px;margin:24px 0 0;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;">
    <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">GETX — Get X. Get gaming.<br><a href="https://getx.gg" style="color:#2563eb;">getx.gg</a></p>
  </div>
</body>
</html>`;
    await this.send(
      email,
      subject,
      html,
      `Your GETX verification code: ${otp}`,
    );
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const subject = 'Welcome to GETX!';
    const safeName = this.escapeHtml(name);
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fafbfc;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:12px;padding:40px;">
    <h1 style="color:#2563eb;margin:0 0 16px;font-size:32px;">You're in, ${safeName}!</h1>
    <p style="color:#475569;font-size:16px;line-height:1.5;">Your GETX account is verified and ready.</p>
    <ul style="color:#475569;font-size:16px;line-height:1.8;padding-left:20px;">
      <li>Browse gaming accounts and items</li>
      <li>Get expert boosting services</li>
      <li>Sell your gaming assets</li>
      <li>Protected by GETX TradeShield</li>
    </ul>
    <a href="https://getx.gg" style="display:inline-block;background:#2563eb;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;margin-top:24px;font-weight:600;">Visit GETX</a>
  </div>
</body>
</html>`;
    await this.send(
      email,
      subject,
      html,
      "You're in! Your GETX account is verified.",
    );
  }

  async sendPasswordReset(
    email: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    const subject = 'Reset your GETX password';
    const safeName = this.escapeHtml(name);
    const safeUrl = this.escapeHtml(resetUrl);
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fafbfc;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:12px;padding:40px;">
    <h1 style="color:#2563eb;margin:0 0 16px;font-size:28px;">Hi ${safeName},</h1>
    <p style="color:#475569;font-size:16px;line-height:1.5;">Click below to reset your GETX password:</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.5;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin-top:24px;">Or copy this link:<br><span style="color:#2563eb;word-break:break-all;">${safeUrl}</span></p>
  </div>
</body>
</html>`;
    await this.send(
      email,
      subject,
      html,
      `Reset your GETX password: ${resetUrl}`,
    );
  }

  /**
   * Generic notification email. Wraps the caller's HTML in the standard
   * GETX shell so the look stays consistent across order/offer/review
   * notifications.
   */
  async sendNotification(params: {
    to: string;
    subject: string;
    title: string;
    body?: string;
    actionUrl?: string;
    actionLabel?: string;
  }): Promise<void> {
    const safeTitle = this.escapeHtml(params.title);
    const safeBody = params.body ? this.escapeHtml(params.body) : '';
    const safeUrl = params.actionUrl ? this.escapeHtml(params.actionUrl) : '';
    const safeLabel = this.escapeHtml(params.actionLabel ?? 'View on GETX');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fafbfc;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:12px;padding:40px;">
    <h1 style="color:#2563eb;margin:0 0 16px;font-size:24px;">${safeTitle}</h1>
    ${safeBody ? `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">${safeBody}</p>` : ''}
    ${
      safeUrl
        ? `<div style="text-align:center;margin:32px 0;">
             <a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;">${safeLabel}</a>
           </div>`
        : ''
    }
    <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;">
    <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">GETX — Get X. Get gaming.</p>
  </div>
</body>
</html>`;
    await this.send(
      params.to,
      params.subject,
      html,
      `${params.title}\n${params.body ?? ''}`,
    );
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    mockText?: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log('===== MOCK EMAIL =====');
      this.logger.log(`To: ${to}`);
      this.logger.log(`Subject: ${subject}`);
      if (mockText) this.logger.log(`Body: ${mockText}`);
      this.logger.log('(Set RESEND_API_KEY to send real emails)');
      this.logger.log('======================');
      return;
    }

    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error as Error);
      throw error;
    }
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
