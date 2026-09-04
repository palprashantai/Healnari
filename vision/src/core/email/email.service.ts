import dns from 'node:dns';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { FALLBACK_EMAIL_TEMPLATES } from './email-templates.fallback';

// Mask email for privacy in logs (SEC-7)
function maskEmail(email: string): string {
  if (!email) return '***';
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
  templateKey?: string;
  entityType?: string;
  entityId?: string;
  event?: string;
  variables?: Record<string, any>;
}

export interface SendTemplateEmailOptions {
  templateKey: string;
  to: string;
  variables?: Record<string, string | number | boolean | undefined | null>;
  attachments?: MailAttachment[];
  entityType?: string;
  entityId?: string;
  event?: string;
}

// Backward-compatibility interface for existing calls
export interface TemplatedMailOptions {
  to: string;
  slug: string;
  defaultSubject?: string;
  defaultHtml?: string;
  variables?: Record<string, string | number | boolean | undefined | null>;
  attachments?: MailAttachment[];
  entityType?: string;
  entityId?: string;
  event?: string;
}

interface CachedTemplate {
  subject?: string;
  content: string;
  preheader?: string;
  isActive: boolean;
  fetchedAt: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;
  private readonly frontendUrl: string;
  private templateCache = new Map<string, CachedTemplate>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory TTL
  private retryQueue: { payload: MailPayload; attempts: number }[] = [];
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.from =
      this.configService.get<string>('EMAIL_FROM') ||
      process.env.EMAIL_FROM ||
      'HealNari <no-reply@healnari.app>';

    this.frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'https://healnari.vercel.app'
    ).replace(/\/$/, '');

    const host =
      this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    const user =
      this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const pass =
      this.configService.get<string>('SMTP_PASS') || process.env.SMTP_PASS;

    if (typeof dns.setDefaultResultOrder === 'function') {
      dns.setDefaultResultOrder('ipv4first');
    }

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(
          this.configService.get<string>('SMTP_PORT') ||
            process.env.SMTP_PORT ||
            587,
        ),
        secure:
          (this.configService.get<string>('SMTP_SECURE') ||
            process.env.SMTP_SECURE) === 'true',
        auth: { user, pass },
        pool: true,
        maxConnections: 5,
        family: 4,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        dnsTimeout: 10000,
        tls: {
          rejectUnauthorized: false,
        },
      } as any);
      this.logger.log(`Email service configured with SMTP host: ${host}`);
    } else {
      this.logger.warn('SMTP not configured — emails will be logged only.');
    }
  }

  get isConfigured(): boolean {
    return !!this.transporter;
  }

  /**
   * Helper to generate absolute frontend URL for CTAs without hardcoding domains.
   */
  getUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.frontendUrl}${cleanPath}`;
  }

  /**
   * Invalidate template cache (called when an admin updates a template).
   */
  invalidateTemplateCache(templateKey?: string) {
    if (templateKey) {
      this.templateCache.delete(templateKey);
    } else {
      this.templateCache.clear();
    }
  }

  /**
   * Primary method: Sends an email using a database-managed template.
   * Resolves template from DB, validates variables, renders responsive HTML,
   * dispatches via SMTP, and records to email_logs.
   */
  async sendTemplateEmail(options: SendTemplateEmailOptions): Promise<boolean> {
    const {
      templateKey,
      to,
      variables = {},
      attachments,
      entityType,
      entityId,
      event,
    } = options;

    if (!to) {
      this.logger.warn(`Cannot send email '${templateKey}' — recipient email is empty`);
      return false;
    }

    const hardcoded = FALLBACK_EMAIL_TEMPLATES[templateKey];
    let templateSubject = hardcoded?.subject || `Notification: ${templateKey}`;
    let templateHtml = hardcoded?.content || `<p>Hello,</p><p>You have a new update from HealNari.</p>`;
    let preheader = hardcoded?.preheader || '';

    try {
      // 1. Check in-memory cache
      const cached = this.templateCache.get(templateKey);
      const now = Date.now();

      if (cached && now - cached.fetchedAt < this.CACHE_TTL_MS) {
        if (!cached.isActive) {
          this.logger.warn(`Template '${templateKey}' is inactive — skipping delivery.`);
          return false;
        }
        if (cached.subject) templateSubject = cached.subject;
        if (cached.content) templateHtml = cached.content;
        if (cached.preheader) preheader = cached.preheader;
      } else {
        // 2. Fetch from Supabase message_templates
        const { data: dbTemplate, error } = await this.supabase.admin
          .from('message_templates')
          .select('subject, content, preheader, is_active')
          .eq('slug', templateKey)
          .maybeSingle();

        if (!error && dbTemplate) {
          if (dbTemplate.is_active === false) {
            this.templateCache.set(templateKey, {
              isActive: false,
              content: '',
              fetchedAt: now,
            });
            this.logger.warn(`Template '${templateKey}' is inactive — skipping delivery.`);
            return false;
          }

          if (dbTemplate.subject) templateSubject = dbTemplate.subject;
          if (dbTemplate.content) templateHtml = dbTemplate.content;
          if (dbTemplate.preheader) preheader = dbTemplate.preheader;

          this.templateCache.set(templateKey, {
            subject: dbTemplate.subject,
            content: dbTemplate.content,
            preheader: dbTemplate.preheader,
            isActive: true,
            fetchedAt: now,
          });
        } else {
          this.logger.warn(
            `Template '${templateKey}' not found in database — using ${hardcoded ? 'built-in structured' : 'default generic'} fallback`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to fetch template '${templateKey}' from DB: ${err.message}`,
      );
    }

    // 3. Interpolate variables into subject, preheader, and HTML body
    const interpolatedSubject = this.interpolate(templateSubject, variables);
    const interpolatedPreheader = this.interpolate(preheader, variables);
    const interpolatedHtml = this.interpolate(templateHtml, variables);

    // 4. Wrap with responsive, healthcare-branded HealNari layout
    const finalHtml = this.wrapWithLayout(interpolatedHtml, interpolatedPreheader);

    // 5. Send mail
    return this.sendMail({
      to,
      subject: interpolatedSubject,
      html: finalHtml,
      attachments,
      templateKey,
      entityType,
      entityId,
      event: event || templateKey,
      variables,
    });
  }

  /**
   * Backward-compatibility alias for existing callers.
   */
  async sendTemplatedMail(options: TemplatedMailOptions): Promise<boolean> {
    return this.sendTemplateEmail({
      templateKey: options.slug,
      to: options.to,
      variables: options.variables,
      attachments: options.attachments,
      entityType: options.entityType,
      entityId: options.entityId,
      event: options.event,
    });
  }

  /**
   * Replaces all {{key}} placeholders in text with provided variable values safely.
   * Ensures missing variables do not output "undefined", "null", or raw curly tags.
   */
  private interpolate(
    text: string,
    variables: Record<string, any> = {},
  ): string {
    if (!text) return '';
    // 1. Replace defined variables
    let result = text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      const val = variables[key];
      if (val === undefined || val === null) {
        return '';
      }
      return String(val);
    });
    // 2. Clean up any accidental double spaces created by empty token replacements
    result = result.replace(/  +/g, ' ');
    return result;
  }

  /**
   * Wraps inner HTML in a responsive, modern HealNari email design frame.
   */
  private wrapWithLayout(innerHtml: string, preheaderText = ''): string {
    if (innerHtml && innerHtml.toLowerCase().includes('<html')) {
      return innerHtml;
    }

    const year = new Date().getFullYear();
    const invisiblePadding = '&#847;&zwnj;&nbsp;&#8199;&shy;'.repeat(25);

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>HealNari</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body { margin: 0 !important; padding: 0 !important; -webkit-text-size-adjust: 100% !important; -ms-text-size-adjust: 100% !important; }
    table, td { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0 !important; height: auto !important; line-height: 100% !important; outline: none !important; text-decoration: none !important; }
    a { color: #6B46C1; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-cell { padding: 24px 20px !important; }
      .header-cell { padding: 22px 20px !important; }
      .footer-cell { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  ${preheaderText ? `<div style="display: none; font-size: 1px; color: #F8FAFC; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${preheaderText} ${invisiblePadding}</div>` : ''}
  
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; width: 100%; margin: 0; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table class="email-container" width="100%" max-width="580" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(42, 22, 71, 0.08); border: 1px solid #E2E8F0; max-width: 580px; margin: 0 auto;">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #2A1647 0%, #6B46C1 50%, #EC4899 100%); height: 5px; font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td class="header-cell" style="padding: 24px 36px 18px 36px; text-align: center; border-bottom: 1px solid #F1F5F9;">
              <a href="${this.frontendUrl}" target="_blank" style="display: inline-block; text-decoration: none;">
                <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td align="center" style="vertical-align: middle; padding-right: 14px;">
                      <img 
                        src="https://healnari.vercel.app/brand/logo-icon.png" 
                        alt="HealNari Logo" 
                        width="52" 
                        height="52" 
                        style="display: block; width: 52px; height: 52px; border-radius: 50%; border: 0; outline: none;" 
                      />
                    </td>
                    <td align="left" style="vertical-align: middle;">
                      <span style="font-size: 28px; font-weight: 900; color: #2A1647; letter-spacing: -0.5px; font-family: 'Playfair Display', Georgia, serif; line-height: 1.1; display: block;">
                        Heal<span style="color: #E23E8C;">Nari</span>
                      </span>
                      <span style="display: block; font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin-top: 3px;">
                        Women's Specialized Telemedicine &amp; Care
                      </span>
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td class="content-cell" style="padding: 32px 36px; color: #334155; font-size: 15px; line-height: 1.6;">
              ${innerHtml}
            </td>
          </tr>

          <!-- Help Card -->
          <tr>
            <td style="padding: 0 36px 20px 36px;">
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 16px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                  Need assistance? Contact our patient care team at <a href="mailto:support@healnari.app" style="color: #6B46C1; font-weight: 600; text-decoration: underline;">support@healnari.app</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-cell" style="background-color: #F8FAFC; padding: 24px 36px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 700; color: #475569;">
                HealNari Women's Healthcare Network
              </p>
              <p style="margin: 0 0 12px 0; color: #94A3B8; font-size: 11px;">
                DPDP Act, 2023 Compliant &bull; End-to-End Encrypted Telemedicine &bull; Certified Specialists
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                &copy; ${year} HealNari. All rights reserved. &bull; <a href="${this.frontendUrl}/legal/privacy" style="color: #6B46C1; text-decoration: underline;">Privacy Policy</a> &bull; <a href="${this.frontendUrl}/legal/terms" style="color: #6B46C1; text-decoration: underline;">Terms of Service</a>
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

  /**
   * Dispatches email via nodemailer transporter and records delivery log in email_logs.
   */
  async sendMail(payload: MailPayload): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not configured — simulated "${payload.subject}" to ${maskEmail(payload.to)}`,
      );
      this.logToDatabase({
        ...payload,
        status: 'SENT',
        providerMessageId: 'simulated-local-delivery',
      }).catch(() => {});
      return true;
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

      this.logger.log(
        `Sent mail "${payload.subject}" to ${maskEmail(payload.to)} (${info.messageId})`,
      );

      this.logToDatabase({
        ...payload,
        status: 'SENT',
        providerMessageId: info.messageId,
      }).catch(() => {});

      return true;
    } catch (err) {
      this.logger.error(
        `Failed to send mail to ${maskEmail(payload.to)}: ${err.message}`,
        err.stack,
      );

      this.logToDatabase({
        ...payload,
        status: 'FAILED',
        error: err.message,
      }).catch(() => {});

      this.queueForRetry(payload);
      return false;
    }
  }

  /**
   * Records email dispatch to public.email_logs.
   */
  private async logToDatabase(data: {
    to: string;
    subject: string;
    templateKey?: string;
    entityType?: string;
    entityId?: string;
    event?: string;
    variables?: Record<string, any>;
    status: string;
    providerMessageId?: string;
    error?: string;
  }) {
    try {
      await this.supabase.admin.from('email_logs').insert({
        template_key: data.templateKey || 'direct_mail',
        recipient: maskEmail(data.to),
        subject: data.subject,
        event: data.event || null,
        entity_type: data.entityType || null,
        entity_id: data.entityId || null,
        status: data.status,
        provider_message_id: data.providerMessageId || null,
        error: data.error || null,
        variables: data.variables || {},
      });
    } catch (err) {
      // Non-blocking logger error
      this.logger.debug(`Could not write to email_logs: ${err.message}`);
    }
  }

  /**
   * Queues a failed email for background retry.
   */
  private queueForRetry(payload: MailPayload, attempts = 1) {
    if (attempts <= this.MAX_RETRIES) {
      this.logger.warn(
        `Queueing email to ${maskEmail(payload.to)} for retry (Attempt ${attempts}/${this.MAX_RETRIES})`,
      );
      this.retryQueue.push({ payload, attempts });
    } else {
      this.logger.error(
        `Permanently dropping email to ${maskEmail(payload.to)} after ${this.MAX_RETRIES} attempts.`,
      );
    }
  }

  /**
   * Background task to process failed emails every minute.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processRetryQueue() {
    if (this.retryQueue.length === 0 || !this.transporter) return;

    this.logger.log(`Processing ${this.retryQueue.length} email(s) in retry queue...`);

    const currentQueue = [...this.retryQueue];
    this.retryQueue = [];

    for (const item of currentQueue) {
      try {
        const info = await this.transporter.sendMail({
          from: this.from,
          to: item.payload.to,
          subject: item.payload.subject,
          html: item.payload.html,
          text: item.payload.text,
          attachments: item.payload.attachments,
        });

        this.logger.log(
          `Successfully sent retried email to ${maskEmail(item.payload.to)} (${info.messageId})`,
        );

        this.logToDatabase({
          ...item.payload,
          status: 'SENT',
          providerMessageId: info.messageId,
        }).catch(() => {});
      } catch (err) {
        this.logger.warn(
          `Retry failed for ${maskEmail(item.payload.to)}: ${err.message}`,
        );
        this.queueForRetry(item.payload, item.attempts + 1);
      }
    }
  }
}
