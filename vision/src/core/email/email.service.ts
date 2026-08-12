import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
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
      });
    }
  }

  get isConfigured() {
    return !!this.transporter;
  }

  async sendMail(payload: MailPayload): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Email not configured — skipped "${payload.subject}" to ${payload.to}`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${payload.to}: ${err.message}`);
      return false;
    }
  }
}
