import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// AUDIT_REPORT.md SEC-7 — logs shouldn't carry full patient/doctor email
// addresses in plaintext; keep enough to correlate a support ticket
// ("did j***@gmail.com's email go out?") without logging the full PII.
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: MailAttachment[];
}

/** Real SMTP email delivery, configured via env vars — same
 * configure-or-gracefully-no-op shape as PushSubscriptionsService's VAPID
 * check. Nothing in this codebase sent real email before this; until
 * SMTP_HOST/SMTP_USER/SMTP_PASS are set, sendMail() logs a warning and
 * returns false instead of throwing, so callers (account creation, etc.)
 * can keep working and surface "email not configured" rather than fail
 * the whole request over a missing mail server. */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor() {
    this.from = process.env.EMAIL_FROM || 'HealNari <no-reply@healnari.app>';
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
        // Without pooling, every sendMail() pays a fresh SMTP connection +
        // TLS handshake — real latency on request paths that await this
        // directly (e.g. lead/consultation approval emails).
        pool: true,
        maxConnections: 5,
      });
    }
  }

  get isConfigured() {
    return !!this.transporter;
  }

  async sendMail(payload: MailPayload): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Email not configured — skipped "${payload.subject}" to ${maskEmail(payload.to)}`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        attachments: payload.attachments,
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${maskEmail(payload.to)}: ${err.message}`);
      return false;
    }
  }
}
