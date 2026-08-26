import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SupabaseService } from '@/core/supabase/supabase.service';

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

export interface TemplatedMailOptions {
  to: string;
  slug: string;
  defaultSubject: string;
  defaultHtml: string;
  variables?: Record<string, string | number | undefined | null>;
  attachments?: MailAttachment[];
}

interface CachedTemplate {
  subject?: string;
  content: string;
  fetchedAt: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;
  private templateCache = new Map<string, CachedTemplate>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

  constructor(private readonly supabase: SupabaseService) {
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
        pool: true,
        maxConnections: 5,
      });
    }
  }

  get isConfigured() {
    return !!this.transporter;
  }

  /**
   * Invalidate template cache (called when admin updates a template).
   */
  invalidateTemplateCache(slug?: string) {
    if (slug) {
      this.templateCache.delete(slug);
    } else {
      this.templateCache.clear();
    }
  }

  /**
   * Sends an email using a database-managed template if available in Supabase,
   * otherwise falls back to the default subject & HTML provided in code.
   * Interpolates {{variableName}} placeholders.
   */
  async sendTemplatedMail(options: TemplatedMailOptions): Promise<boolean> {
    const { to, slug, defaultSubject, defaultHtml, variables = {}, attachments } = options;

    let templateSubject = defaultSubject;
    let templateHtml = defaultHtml;

    try {
      // 1. Check in-memory cache
      const cached = this.templateCache.get(slug);
      const now = Date.now();

      if (cached && now - cached.fetchedAt < this.CACHE_TTL_MS) {
        if (cached.subject) templateSubject = cached.subject;
        if (cached.content) templateHtml = cached.content;
      } else {
        // 2. Fetch from Supabase message_templates
        const { data: dbTemplate, error } = await this.supabase.admin
          .from('message_templates')
          .select('subject, content')
          .eq('slug', slug)
          .maybeSingle();

        if (!error && dbTemplate?.content) {
          if (dbTemplate.subject) templateSubject = dbTemplate.subject;
          templateHtml = dbTemplate.content;
          this.templateCache.set(slug, {
            subject: dbTemplate.subject,
            content: dbTemplate.content,
            fetchedAt: now,
          });
        }
      }
    } catch (err) {
      this.logger.warn(`Could not load template '${slug}' from database, using code default: ${err.message}`);
    }

    // 3. Interpolate variables into subject and HTML
    const interpolatedSubject = this.interpolate(templateSubject, variables);
    const interpolatedHtml = this.interpolate(templateHtml, variables);

    return this.sendMail({
      to,
      subject: interpolatedSubject,
      html: interpolatedHtml,
      attachments,
    });
  }

  /**
   * Replaces all {{key}} placeholders in text with the provided variable values.
   */
  private interpolate(text: string, variables: Record<string, string | number | undefined | null>): string {
    if (!text) return '';
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      const val = variables[key];
      return val !== undefined && val !== null ? String(val) : match;
    });
  }

  /**
   * Wraps partial HTML in a professional email template with header and footer.
   */
  private wrapWithLayout(innerHtml: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HealNari</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 600px; margin: 0 auto;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <a href="https://healnari.vercel.app" style="text-decoration:none; display:inline-block;">
                <img src="https://healnari.vercel.app/brand/logo-full.png" alt="HealNari Logo" width="160" style="display: block; border: 0; max-width: 100%; height: auto;" />
              </a>
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px;">
              ${innerHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; font-weight: bold;">
                HealNari Women's Healthcare
              </p>
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                123 Wellness Avenue, Health District<br>
                Contact: support@healnari.com | +91 98765 43210
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                &copy; ${new Date().getFullYear()} HealNari. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendMail(payload: MailPayload): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Email not configured — skipped "${payload.subject}" to ${maskEmail(payload.to)}`);
      return false;
    }

    let finalHtml = payload.html;
    if (finalHtml && !finalHtml.toLowerCase().includes('<html')) {
      finalHtml = this.wrapWithLayout(finalHtml);
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: finalHtml,
        text: payload.text,
        attachments: payload.attachments,
      });
      this.logger.log(`Sent mail "${payload.subject}" to ${maskEmail(payload.to)} (${info.messageId})`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send mail to ${maskEmail(payload.to)}: ${err.message}`, err.stack);
      return false;
    }
  }
}
