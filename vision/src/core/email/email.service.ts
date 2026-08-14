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
