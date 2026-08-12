import * as Sentry from '@sentry/node';

/** AUDIT_REPORT.md OPS-3 — production failures were stdout-only; nothing
 * paged anyone when e.g. a payment webhook 500'd. Same
 * configure-or-gracefully-no-op shape as EmailService/CashfreeService:
 * without SENTRY_DSN set, captureException() is just a no-op rather than
 * failing the request over a missing monitoring key. */
let enabled = false;

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
  enabled = true;
}

export function captureException(error: unknown) {
  if (enabled) Sentry.captureException(error);
}
