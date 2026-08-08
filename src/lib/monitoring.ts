// Error monitoring, stubbed behind an env var. With no VITE_SENTRY_DSN set
// (the default), every export here is a no-op — nothing is loaded or sent
// anywhere. Set VITE_SENTRY_DSN (locally in .env, and in the Vercel project
// settings) to turn this on for real.

import type * as SentryTypes from '@sentry/react';

let sentry: typeof SentryTypes | null = null;
let initialized = false;

export function initMonitoring() {
  if (initialized) return;
  initialized = true;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  import('@sentry/react').then((mod) => {
    sentry = mod;
    mod.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: import.meta.env.MODE,
    });
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (sentry) {
    sentry.captureException(error, context ? { extra: context } : undefined);
  }
}

export function addBreadcrumb(message: string, level: 'debug' | 'info' | 'warn' | 'error', data?: unknown) {
  if (sentry) {
    sentry.addBreadcrumb({ message, level: level === 'warn' ? 'warning' : level, data: data ? { data } : undefined });
  }
}
