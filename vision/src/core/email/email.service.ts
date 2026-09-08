import dns from 'node:dns';
import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { FALLBACK_EMAIL_TEMPLATES } from './email-templates.fallback';
import { CronLockService } from '@/core/scheduler/cron-lock.service';

// Patch nodemailer's shared networkInterfaces to strip IPv6.
// Render and many cloud containers have no IPv6 outbound routing; if an SMTP attempt fails over IPv4,
// nodemailer's internal address fallback would otherwise attempt IPv6 and trigger ENETUNREACH errors.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const shared = require('nodemailer/lib/shared');
  if (shared && shared.networkInterfaces) {
    const ipv4Only: Record<string, any[]> = {};
    for (const [name, ifaces] of Object.entries(shared.networkInterfaces)) {
      if (Array.isArray(ifaces)) {
        ipv4Only[name] = ifaces.filter(
          (i: any) => i.family === 'IPv4' || i.family === 4,
        );
      }
    }
    shared.networkInterfaces = ipv4Only;
  }
} catch {
  // Safe ignore if shared module is not directly accessible
}

// Mask email for privacy in logs (SEC-7 / HIPAA compliance)
export function maskEmail(email: string): string {
  if (!email) return '***';
  const clean = email.trim();
  const atIndex = clean.indexOf('@');
  if (atIndex <= 1) return '***@' + (clean.split('@')[1] || '***');
  const local = clean.slice(0, atIndex);
  const domain = clean.slice(atIndex + 1);
  return `${local.slice(0, 1)}***@${domain}`;
}

export enum SmtpErrorCode {
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  DNS_ERROR = 'DNS_ERROR',
  TLS_ERROR = 'TLS_ERROR',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  MAILBOX_UNAVAILABLE = 'MAILBOX_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  TEMPORARY_SMTP_FAILURE = 'TEMPORARY_SMTP_FAILURE',
  PERMANENT_SMTP_FAILURE = 'PERMANENT_SMTP_FAILURE',
}

export interface ClassifiedSmtpError {
  code: SmtpErrorCode;
  isTemporary: boolean;
  message: string;
  diagnostics: string;
}

export function classifySmtpError(err: any): ClassifiedSmtpError {
  const errMsg = String(err?.message || '');
  const errCode = String(err?.code || '');
  const responseCode = Number(err?.responseCode || 0);

  // 1. Connection Timeout (e.g. Render Free Tier outbound SMTP port block)
  if (
    errCode === 'ETIMEDOUT' ||
    errMsg.includes('Connection timeout') ||
    errMsg.includes('timed out') ||
    errMsg.includes('ETIMEDOUT')
  ) {
    return {
      code: SmtpErrorCode.CONNECTION_TIMEOUT,
      isTemporary: true,
      message: 'SMTP connection timed out while establishing socket connection.',
      diagnostics:
        'SMTP connection timed out. On Render Free Tier, outbound TCP ports 25, 465, and 587 are firewalled at the infrastructure level. Solution: Upgrade Render to Starter ($7/mo) or deploy to an SMTP-compatible environment.',
    };
  }

  // 2. Connection Refused
  if (errCode === 'ECONNREFUSED' || errMsg.includes('ECONNREFUSED')) {
    return {
      code: SmtpErrorCode.CONNECTION_REFUSED,
      isTemporary: true,
      message: 'SMTP server refused the connection on configured host and port.',
      diagnostics:
        'Remote SMTP host actively refused connection. Verify SMTP_HOST and SMTP_PORT match provider specifications.',
    };
  }

  // 3. DNS Resolution Error
  if (
    errCode === 'ENOTFOUND' ||
    errCode === 'EAI_AGAIN' ||
    errMsg.includes('getaddrinfo ENOTFOUND')
  ) {
    return {
      code: SmtpErrorCode.DNS_ERROR,
      isTemporary: false,
      message: 'Failed to resolve SMTP hostname in DNS.',
      diagnostics:
        'DNS resolution failed for SMTP_HOST. Verify the hostname is typed correctly in environment variables.',
    };
  }

  // 4. TLS / Handshake Error
  if (
    errCode === 'ESOCKET' ||
    errMsg.includes('self-signed') ||
    errMsg.includes('certificate') ||
    errMsg.includes('SSL') ||
    errMsg.includes('TLS')
  ) {
    return {
      code: SmtpErrorCode.TLS_ERROR,
      isTemporary: false,
      message: 'TLS/SSL handshake negotiation failed with SMTP server.',
      diagnostics:
        'TLS handshake failed. Verify port and security matching (Port 465 requires SMTP_SECURE=true; Port 587 requires SMTP_SECURE=false with STARTTLS).',
    };
  }

  // 5. Authentication Failed
  if (
    responseCode === 535 ||
    errMsg.includes('Username and Password not accepted') ||
    errMsg.includes('5.7.8') ||
    errMsg.includes('Invalid login') ||
    errMsg.includes('BadCredentials')
  ) {
    return {
      code: SmtpErrorCode.AUTHENTICATION_FAILED,
      isTemporary: false,
      message: 'SMTP authentication failed. Invalid username or application password.',
      diagnostics:
        'SMTP credentials were rejected. If using Gmail, you must generate a 16-character Google App Password (with 2FA enabled), not your personal account password.',
    };
  }

  // 6. Rate Limited / Quota Exceeded
  if (
    responseCode === 421 ||
    responseCode === 450 ||
    errMsg.includes('Too many') ||
    errMsg.includes('rate limit') ||
    errMsg.includes('daily sending quota')
  ) {
    return {
      code: SmtpErrorCode.RATE_LIMITED,
      isTemporary: true,
      message: 'SMTP provider rate limit or sending quota exceeded.',
      diagnostics:
        'Provider sending rate or quota limit reached. Message will be retried automatically.',
    };
  }

  // 7. Mailbox Unavailable / Bad Recipient
  if (responseCode >= 550 && responseCode <= 554) {
    return {
      code: SmtpErrorCode.MAILBOX_UNAVAILABLE,
      isTemporary: false,
      message: 'Recipient address does not exist or was rejected by receiving server.',
      diagnostics:
        'Recipient mailbox is invalid, disabled, or rejected by recipient mail exchange.',
    };
  }

  // 8. General 4xx Temporary Failure
  if (responseCode >= 400 && responseCode < 500) {
    return {
      code: SmtpErrorCode.TEMPORARY_SMTP_FAILURE,
      isTemporary: true,
      message: `Temporary SMTP error (${responseCode}): ${errMsg}`,
      diagnostics:
        'Temporary mail server failure. Email will be queued for background retry.',
    };
  }

  // 9. Permanent Failure
  return {
    code: SmtpErrorCode.PERMANENT_SMTP_FAILURE,
    isTemporary: false,
    message: errMsg || 'Unknown SMTP failure',
    diagnostics: errMsg,
  };
}

export interface SmtpHealthStatus {
  status: 'CONNECTED' | 'FAILED';
  host: string;
  port: number;
  secure: boolean;
  errorClassification?: SmtpErrorCode;
  diagnosticMessage?: string;
  timestamp: string;
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

interface RetryQueueItem {
  payload: MailPayload;
  attempts: number;
  nextRetryAt: number;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly smtpHost: string;
  private readonly smtpPort: number;
  private readonly smtpSecure: boolean;
  private readonly smtpUser: string;
  private readonly from: string;
  private readonly frontendUrl: string;
  private templateCache = new Map<string, CachedTemplate>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory TTL
  private retryQueue: RetryQueueItem[] = [];
  private readonly MAX_RETRIES = 3;

  // Deduplication cache to prevent duplicate healthcare emails for the same event & entity
  private recentDispatches = new Map<string, number>();
  private readonly DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes window

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
    @Optional() private readonly cronLock?: CronLockService,
  ) {
    // 1. Resolve Frontend URL
    this.frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'https://healnari.vercel.app'
    ).replace(/\/$/, '');

    // 2. Resolve From Address (supports MAIL_FROM or EMAIL_FROM, plus optional MAIL_FROM_NAME)
    const rawFrom =
      this.configService.get<string>('MAIL_FROM') ||
      process.env.MAIL_FROM ||
      this.configService.get<string>('EMAIL_FROM') ||
      process.env.EMAIL_FROM ||
      '';
    const fromName =
      this.configService.get<string>('MAIL_FROM_NAME') ||
      process.env.MAIL_FROM_NAME ||
      'HealNari';

    if (rawFrom.includes('<')) {
      this.from = rawFrom.trim();
    } else if (rawFrom.includes('@')) {
      this.from = `${fromName} <${rawFrom.trim()}>`;
    } else {
      this.from = `${fromName} <no-reply@healnari.app>`;
    }

    // 3. Resolve SMTP Host & Port
    this.smtpHost = (
      this.configService.get<string>('SMTP_HOST') ||
      process.env.SMTP_HOST ||
      ''
    ).trim();

    this.smtpPort = Number(
      this.configService.get<string>('SMTP_PORT') ||
        process.env.SMTP_PORT ||
        587,
    );

    // 4. Resolve TLS/Secure configuration matching selected port
    const rawSecure =
      this.configService.get<string>('SMTP_SECURE') || process.env.SMTP_SECURE;
    this.smtpSecure =
      rawSecure !== undefined && rawSecure !== ''
        ? rawSecure === 'true'
        : this.smtpPort === 465;

    // 5. Resolve SMTP Authentication (supports SMTP_USER, SMTP_PASS / SMTP_PASSWORD)
    this.smtpUser = (
      this.configService.get<string>('SMTP_USER') ||
      process.env.SMTP_USER ||
      ''
    )
      .trim()
      .replace(/^["']|["']$/g, '');

    const rawPass =
      this.configService.get<string>('SMTP_PASS') ||
      process.env.SMTP_PASS ||
      this.configService.get<string>('SMTP_PASSWORD') ||
      process.env.SMTP_PASSWORD ||
      '';
    const cleanPass = rawPass.trim().replace(/^["']|["']$/g, '');

    // 6. Force Node.js DNS resolver to prioritize IPv4
    if (typeof dns.setDefaultResultOrder === 'function') {
      dns.setDefaultResultOrder('ipv4first');
    }

    // 7. Initialize Nodemailer Transporter with production-safe timeouts & connection pooling
    if (this.smtpHost && this.smtpUser && cleanPass) {
      this.transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure,
        auth: {
          user: this.smtpUser,
          pass: cleanPass,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        family: 4,
        connectionTimeout: 10000, // 10s socket connection timeout
        greetingTimeout: 10000,   // 10s SMTP greeting timeout
        socketTimeout: 15000,     // 15s socket inactivity timeout
        dnsTimeout: 5000,         // 5s DNS query timeout
        tls: {
          rejectUnauthorized:
            (this.configService.get<string>('SMTP_REJECT_UNAUTHORIZED') ||
              process.env.SMTP_REJECT_UNAUTHORIZED) === 'true',
        },
      } as any);
    }
  }

  /**
   * Validates required SMTP configuration at application startup.
   */
  async onModuleInit() {
    const missing: string[] = [];
    if (!this.smtpHost) missing.push('SMTP_HOST');
    if (!this.smtpUser) missing.push('SMTP_USER');
    if (!this.transporter) missing.push('SMTP_PASS/SMTP_PASSWORD');

    if (missing.length === 0) {
      this.logger.log(
        `EmailService: SMTP initialized successfully (host: ${this.smtpHost}:${this.smtpPort}, secure: ${this.smtpSecure}, from: ${this.from})`,
      );
    } else {
      this.logger.warn(
        `EmailService: Missing SMTP configuration (${missing.join(', ')}) — email delivery will be simulated locally.`,
      );
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
   * Verifies SMTP connection, TLS handshake, and authentication without sending an email.
   * Returns safe diagnostics without leaking credentials.
   */
  async verifyConnection(): Promise<SmtpHealthStatus> {
    const timestamp = new Date().toISOString();
    if (!this.transporter) {
      return {
        status: 'FAILED',
        host: this.smtpHost || 'not_configured',
        port: this.smtpPort,
        secure: this.smtpSecure,
        errorClassification: SmtpErrorCode.PERMANENT_SMTP_FAILURE,
        diagnosticMessage:
          'SMTP transporter is not configured. Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in environment.',
        timestamp,
      };
    }

    try {
      await this.transporter.verify();
      return {
        status: 'CONNECTED',
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure,
        diagnosticMessage:
          'SMTP connection, TLS handshake, and authentication verified successfully.',
        timestamp,
      };
    } catch (err: any) {
      const classified = classifySmtpError(err);
      this.logger.error(
        `SMTP Health Check Failed [${classified.code}]: ${classified.message}`,
      );
      return {
        status: 'FAILED',
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure,
        errorClassification: classified.code,
        diagnosticMessage: classified.diagnostics,
        timestamp,
      };
    }
  }

  /**
   * Primary method: Sends an email using a database-managed or fallback template.
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
        }
      }
    } catch (err: any) {
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
   */
  private interpolate(
    text: string,
    variables: Record<string, any> = {},
  ): string {
    if (!text) return '';
    let result = text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      const val = variables[key];
      if (val === undefined || val === null) {
        return '';
      }
      return String(val);
    });
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
                    <td style="vertical-align: middle; padding-right: 10px;">
                      <div style="background: linear-gradient(135deg, #2A1647 0%, #6B46C1 100%); width: 36px; height: 36px; border-radius: 10px; text-align: center; line-height: 36px; color: #FFFFFF; font-size: 18px; font-weight: 900;">
                        H
                      </div>
                    </td>
                    <td style="vertical-align: middle;">
                      <span style="font-size: 22px; font-weight: 800; color: #2A1647; letter-spacing: -0.5px;">Heal<span style="color: #6B46C1;">Nari</span></span>
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td class="content-cell" style="padding: 32px 36px 28px 36px;">
              ${innerHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-cell" style="padding: 24px 36px 32px 36px; background-color: #F8FAFC; border-top: 1px solid #F1F5F9; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #64748B;">
                HealNari — Women's Holistic Health & Clinical Telemedicine
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
   * Calculates an idempotency key for preventing duplicate notifications.
   */
  private getIdempotencyKey(payload: MailPayload): string | null {
    if (!payload.event && !payload.templateKey) return null;
    const event = payload.event || payload.templateKey;
    const entity = `${payload.entityType || 'global'}_${payload.entityId || 'none'}`;
    return `${event}:${entity}:${payload.to.toLowerCase().trim()}`;
  }

  /**
   * Primary email dispatch method via standard SMTP transport.
   * Safe for critical healthcare workflows: never throws unhandled errors.
   */
  async sendMail(payload: MailPayload): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
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

    // 1. Check idempotency to prevent duplicate emails for critical events
    const dedupKey = this.getIdempotencyKey(payload);
    const now = Date.now();
    if (dedupKey) {
      const lastSent = this.recentDispatches.get(dedupKey);
      if (lastSent && now - lastSent < this.DEDUP_WINDOW_MS) {
        this.logger.debug(
          `Suppressed duplicate email [${dedupKey}] sent ${Math.round((now - lastSent) / 1000)}s ago`,
        );
        return true;
      }
    }

    let finalHtml = payload.html;
    if (finalHtml && !finalHtml.toLowerCase().includes('<html')) {
      finalHtml = this.wrapWithLayout(finalHtml);
    }

    const preparedPayload: MailPayload = {
      ...payload,
      html: finalHtml,
    };

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: preparedPayload.to,
        subject: preparedPayload.subject,
        html: preparedPayload.html,
        text: preparedPayload.text,
        attachments: preparedPayload.attachments,
      });

      if (dedupKey) {
        this.recentDispatches.set(dedupKey, now);
      }

      this.logger.log(
        `Sent mail "${payload.subject}" to ${maskEmail(payload.to)} via SMTP (${info.messageId})`,
      );

      this.logToDatabase({
        ...payload,
        status: 'SENT',
        providerMessageId: info.messageId,
      }).catch(() => {});

      return true;
    } catch (err: any) {
      const classified = classifySmtpError(err);

      this.logger.error(
        `Failed to send mail to ${maskEmail(payload.to)} [${classified.code}]: ${classified.message}`,
        err.stack,
      );

      this.logToDatabase({
        ...payload,
        status: 'FAILED',
        error: `[${classified.code}] ${classified.diagnostics}`,
      }).catch(() => {});

      // Only queue for retry if failure is temporary (e.g. timeout, rate limit)
      if (classified.isTemporary) {
        this.queueForRetry(preparedPayload);
      } else {
        this.logger.warn(
          `Dropping non-retryable SMTP error [${classified.code}] for ${maskEmail(payload.to)}`,
        );
      }

      return false;
    }
  }

  /**
   * Diagnostic test method to verify email delivery and identify provider issues.
   */
  async testEmail(recipient: string): Promise<{
    success: boolean;
    provider: string;
    messageId?: string;
    error?: string;
    diagnostics?: string;
    errorClassification?: SmtpErrorCode;
  }> {
    if (!this.transporter) {
      return {
        success: false,
        provider: 'smtp',
        error: 'SMTP transporter not configured',
        diagnostics:
          'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are missing in environment variables.',
        errorClassification: SmtpErrorCode.PERMANENT_SMTP_FAILURE,
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: recipient,
        subject: 'HealNari SMTP Delivery Test',
        html: this.wrapWithLayout(
          '<h2>SMTP System Verified</h2><p>Your HealNari transactional email system is successfully connected via SMTP and delivering messages.</p>',
          'SMTP Delivery Verified',
        ),
      });

      return {
        success: true,
        provider: 'smtp',
        messageId: info.messageId,
      };
    } catch (err: any) {
      const classified = classifySmtpError(err);
      return {
        success: false,
        provider: 'smtp',
        error: classified.message,
        diagnostics: classified.diagnostics,
        errorClassification: classified.code,
      };
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
    } catch (err: any) {
      this.logger.debug(`Could not write to email_logs: ${err.message}`);
    }
  }

  /**
   * Queues a failed email for background retry with exponential backoff.
   * Persists the retry record in email_logs to survive server restarts.
   */
  private async queueForRetry(payload: MailPayload, attempts = 1) {
    if (attempts <= this.MAX_RETRIES) {
      // Exponential backoff: 1 min, 2 min, 4 min
      const delayMs = Math.pow(2, attempts) * 30 * 1000;
      const nextRetryDate = new Date(Date.now() + delayMs);

      this.logger.warn(
        `Queueing email to ${maskEmail(payload.to)} for retry (Attempt ${attempts}/${this.MAX_RETRIES}, next in ${delayMs / 1000}s)`,
      );

      const dbPayload = {
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        templateKey: payload.templateKey,
        entityType: payload.entityType,
        entityId: payload.entityId,
        event: payload.event,
        variables: payload.variables,
      };

      try {
        await this.supabase.admin.from('email_logs').insert({
          template_key: payload.templateKey || 'direct_mail',
          recipient: maskEmail(payload.to),
          subject: payload.subject,
          event: payload.event || null,
          entity_type: payload.entityType || null,
          entity_id: payload.entityId || null,
          status: 'PENDING_RETRY',
          retry_attempts: attempts,
          next_retry_at: nextRetryDate.toISOString(),
          payload: dbPayload,
          variables: payload.variables || {},
        });
      } catch (dbErr: any) {
        this.logger.debug(`Could not persist retry to email_logs: ${dbErr.message}`);
        this.retryQueue.push({ payload, attempts, nextRetryAt: nextRetryDate.getTime() });
      }
    } else {
      this.logger.error(
        `Permanently dropping email to ${maskEmail(payload.to)} after ${this.MAX_RETRIES} attempts.`,
      );
    }
  }

  private async executeLocked(name: string, fn: () => Promise<any>) {
    if (this.cronLock?.runWithLock) {
      return this.cronLock.runWithLock(name, fn);
    }
    return fn();
  }

  /**
   * Background task to process failed emails every minute across distributed nodes.
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'email_retry_queue' })
  async processRetryQueue() {
    await this.executeLocked('email_retry_queue', async () => {
      if (!this.transporter) return;

      const nowIso = new Date().toISOString();

      // 1. Process persistent retries from email_logs
      const { data: dbItems, error } = await this.supabase.admin
        .from('email_logs')
        .select('id, recipient, subject, retry_attempts, payload, status')
        .eq('status', 'PENDING_RETRY')
        .lte('next_retry_at', nowIso)
        .lt('retry_attempts', this.MAX_RETRIES)
        .order('next_retry_at', { ascending: true })
        .limit(20);

      if (!error && dbItems && dbItems.length > 0) {
        this.logger.log(`Processing ${dbItems.length} persistent retry email(s) from database...`);

        for (const item of dbItems) {
          // Atomically claim by transitioning status to RETRYING
          const { data: claimed } = await this.supabase.admin
            .from('email_logs')
            .update({ status: 'RETRYING' })
            .eq('id', item.id)
            .eq('status', 'PENDING_RETRY')
            .select('id');

          if (!claimed || claimed.length === 0) continue;

          const p = item.payload as MailPayload;
          if (!p || !p.to) {
            await this.supabase.admin
              .from('email_logs')
              .update({ status: 'FAILED', error: 'Invalid payload in retry record' })
              .eq('id', item.id);
            continue;
          }

          const currentAttempt = (item.retry_attempts || 0) + 1;

          try {
            const info = await this.transporter.sendMail({
              from: this.from,
              to: p.to,
              subject: p.subject,
              html: p.html,
              text: p.text,
            });

            this.logger.log(
              `Successfully sent retried email to ${maskEmail(p.to)} via SMTP (${info.messageId})`,
            );

            await this.supabase.admin
              .from('email_logs')
              .update({
                status: 'SENT',
                provider_message_id: info.messageId,
                retry_attempts: currentAttempt,
                error: null,
              })
              .eq('id', item.id);
          } catch (err: any) {
            const classified = classifySmtpError(err);
            this.logger.warn(
              `Retry attempt ${currentAttempt} failed for ${maskEmail(p.to)} [${classified.code}]: ${classified.message}`,
            );

            if (classified.isTemporary && currentAttempt < this.MAX_RETRIES) {
              const delayMs = Math.pow(2, currentAttempt) * 30 * 1000;
              const nextRetry = new Date(Date.now() + delayMs).toISOString();

              await this.supabase.admin
                .from('email_logs')
                .update({
                  status: 'PENDING_RETRY',
                  retry_attempts: currentAttempt,
                  next_retry_at: nextRetry,
                  error: `[${classified.code}] ${classified.diagnostics}`,
                })
                .eq('id', item.id);
            } else {
              await this.supabase.admin
                .from('email_logs')
                .update({
                  status: 'FAILED',
                  retry_attempts: currentAttempt,
                  error: `[${classified.code}] ${classified.diagnostics}`,
                })
                .eq('id', item.id);
            }
          }
        }
      }

      // 2. Also process in-memory fallback items if any exist
      const now = Date.now();
      const readyMemoryItems = this.retryQueue.filter((item) => item.nextRetryAt <= now);
      if (readyMemoryItems.length > 0) {
        this.retryQueue = this.retryQueue.filter((item) => item.nextRetryAt > now);

        for (const item of readyMemoryItems) {
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
              `Successfully sent memory-retried email to ${maskEmail(item.payload.to)} via SMTP (${info.messageId})`,
            );

            this.logToDatabase({
              ...item.payload,
              status: 'SENT',
              providerMessageId: info.messageId,
            }).catch(() => {});
          } catch (err: any) {
            const classified = classifySmtpError(err);
            this.logger.warn(
              `Memory retry attempt ${item.attempts} failed for ${maskEmail(item.payload.to)}: ${classified.message}`,
            );

            if (classified.isTemporary && item.attempts < this.MAX_RETRIES) {
              this.queueForRetry(item.payload, item.attempts + 1);
            }
          }
        }
      }
    });
  }
}
