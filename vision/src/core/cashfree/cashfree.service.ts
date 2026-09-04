import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ERROR_MESSAGES, ERROR_CODES } from '@/core/constants/errors.constant';

export interface CreateCashfreeOrderParams {
  orderId: string;
  amount: number;
  /** AUDIT_REPORT.md DB-3 — defaults to 'INR' rather than being required,
   * so every existing call site (India-only today) needs no change; UAE
   * onboarding passes 'AED' once a doctor's profile.currency is 'AED'. */
  currency?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  /** Omit when API_PUBLIC_URL isn't set — Cashfree will simply not call a
   * webhook for this order; the frontend's post-checkout status poll still
   * settles it, and a dashboard-configured webhook URL (if any) still fires. */
  notifyUrl?: string;
  returnUrl?: string;
  note?: string;
}

/**
 * Thin wrapper around Cashfree's Orders REST API (no SDK dependency — the
 * surface we need is three plain HTTP calls). Order status is always fetched
 * fresh from Cashfree here; nothing in this service trusts a caller-supplied
 * status, so a spoofed webhook body can, at worst, make us re-check a real
 * order early — never mark anything paid on its own say-so.
 */
@Injectable()
export class CashfreeService {
  private readonly logger = new Logger(CashfreeService.name);
  private readonly appId = process.env.CASHFREE_APP_ID;
  private readonly secretKey = process.env.CASHFREE_SECRET_KEY;
  private readonly apiVersion =
    process.env.CASHFREE_API_VERSION || '2023-08-01';
  private readonly baseUrl =
    process.env.CASHFREE_ENV === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

  get isConfigured(): boolean {
    return !!(this.appId && this.secretKey);
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'x-client-id': this.appId as string,
      'x-client-secret': this.secretKey as string,
      'x-api-version': this.apiVersion,
    };
  }

  private requireConfigured() {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException({
        message: ERROR_MESSAGES.PAYMENT_SERVICE_UNAVAILABLE,
        errorCode: ERROR_CODES.PAYMENT_GATEWAY_UNAVAILABLE,
      });
    }
  }

  private async request(path: string, init?: RequestInit) {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: this.headers(),
      });
    } catch (networkErr: any) {
      this.logger.error(
        `Cashfree network connection failed for ${init?.method || 'GET'} ${path}: ${networkErr.message}`,
        networkErr.stack,
      );
      throw new ServiceUnavailableException({
        message: ERROR_MESSAGES.PAYMENT_SERVICE_UNAVAILABLE,
        errorCode: ERROR_CODES.PAYMENT_GATEWAY_UNAVAILABLE,
      });
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      this.logger.error(
        `Cashfree ${init?.method || 'GET'} ${path} -> ${res.status}: ${data?.code || data?.type || 'unknown_error'} — ${data?.message || 'no message'}`,
      );

      if (res.status >= 500) {
        throw new ServiceUnavailableException({
          message: ERROR_MESSAGES.PAYMENT_SERVICE_UNAVAILABLE,
          errorCode: ERROR_CODES.PAYMENT_GATEWAY_UNAVAILABLE,
        });
      }

      throw new BadRequestException({
        message: 'Payment processing failed. Please verify payment details and try again.',
        errorCode: ERROR_CODES.PAYMENT_FAILED,
      });
    }
    return data;
  }

  async createOrder(params: CreateCashfreeOrderParams) {
    this.requireConfigured();
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        order_id: params.orderId,
        order_amount: params.amount,
        order_currency: params.currency || 'INR',
        customer_details: {
          customer_id: params.customerId,
          customer_name: params.customerName,
          customer_email: params.customerEmail || 'patient@healnari.app',
          // Cashfree requires a 10-digit phone; fall back to a placeholder
          // sandbox-safe number when the profile has none on file.
          customer_phone:
            (params.customerPhone || '')
              .replace(/\D/g, '')
              .slice(-10)
              .padStart(10, '9') || '9999999999',
        },
        order_meta: {
          ...(params.notifyUrl ? { notify_url: params.notifyUrl } : {}),
          ...(params.returnUrl ? { return_url: params.returnUrl } : {}),
        },
        order_note: params.note,
      }),
    });
  }

  /** Authoritative order status — ACTIVE | PAID | EXPIRED | TERMINATED. */
  async getOrder(orderId: string) {
    this.requireConfigured();
    return this.request(`/orders/${encodeURIComponent(orderId)}`);
  }

  /** Individual payment attempts against an order — used to pull the actual
   * channel used (upi/card/netbanking/…) and Cashfree's payment id once PAID. */
  async getOrderPayments(orderId: string): Promise<any[]> {
    this.requireConfigured();
    const data = await this.request(
      `/orders/${encodeURIComponent(orderId)}/payments`,
    );
    return Array.isArray(data) ? data : [];
  }

  /** refundId must be unique per order (Cashfree rejects a reused one on
   * retry) — callers should pass a fresh id per attempt. */
  async createRefund(
    orderId: string,
    refundAmount: number,
    refundId: string,
    note?: string,
  ) {
    this.requireConfigured();
    return this.request(`/orders/${encodeURIComponent(orderId)}/refunds`, {
      method: 'POST',
      body: JSON.stringify({
        refund_amount: refundAmount,
        refund_id: refundId,
        refund_note: note || 'Appointment cancelled',
      }),
    });
  }

  /**
   * Cryptographically verifies Cashfree webhook signature using HMAC-SHA256.
   * If Cashfree credentials are not configured or headers are absent in local test,
   * returns true so server-to-server order check acts as the authoritative backstop.
   */
  verifyWebhookSignature(rawBody: string, signature?: string, timestamp?: string): boolean {
    // Only bypass signature verification during local development (no Cashfree credentials
    // configured). In staging and production, always require a valid HMAC-SHA256 signature.
    if (!this.secretKey) return process.env.NODE_ENV === 'development';
    if (!signature || !timestamp) return false;
    try {
      const crypto = require('crypto');
      const payload = `${timestamp}${rawBody}`;
      const expected = crypto
        .createHmac('sha256', this.secretKey)
        .update(payload)
        .digest('base64');
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
  }
}

