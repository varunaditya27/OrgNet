import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] as string,
  );

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const user = config.get<string>('SMTP_USER');
    this.from = config.get<string>('MAIL_FROM') ?? 'OrgNet <noreply@localhost>';
    this.transporter = createTransport({
      host: config.get<string>('SMTP_HOST') ?? 'localhost',
      port: Number(config.get<string>('SMTP_PORT') ?? 587),
      secure: config.get<string>('SMTP_SECURE') === 'true',
      // Plain SMTP inside the Docker network; skips STARTTLS even if the server offers it.
      ignoreTLS: config.get<string>('SMTP_IGNORE_TLS') === 'true',
      auth: user ? { user, pass: config.get<string>('SMTP_PASS') } : undefined,
    });
  }

  async sendPasswordReset(to: string, name: string, link: string) {
    return this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Reset your OrgNet password',
      text: `Hi ${name},\n\nSomeone asked to reset the password for your OrgNet account. Open this link to choose a new one (valid for 1 hour):\n\n${link}\n\nIf this was not you, ignore this email and your password stays the same.`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Someone asked to reset the password for your OrgNet account. Use the link below to choose a new one (valid for 1 hour):</p><p><a href="${escapeHtml(link)}">Reset my password</a></p><p>If this was not you, ignore this email and your password stays the same.</p>`,
    });
  }
}
