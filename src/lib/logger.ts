// Tiny leveled logger. Always logs to the console; forwards warnings and
// errors to Sentry (as breadcrumbs / captured exceptions) when monitoring
// is active, so failures that today get silently swallowed by `catch {}`
// blocks are at least visible somewhere.

import { addBreadcrumb, captureException } from './monitoring';

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, message: string, extra?: unknown) {
  console[level](`[lifeos] ${message}`, ...(extra !== undefined ? [extra] : []));

  if (level === 'warn' || level === 'error') {
    if (level === 'error' && extra instanceof Error) {
      captureException(extra, { message });
    } else {
      addBreadcrumb(message, level, extra);
    }
  }
}

export const logger = {
  debug: (message: string, extra?: unknown) => emit('debug', message, extra),
  info: (message: string, extra?: unknown) => emit('info', message, extra),
  warn: (message: string, extra?: unknown) => emit('warn', message, extra),
  error: (message: string, extra?: unknown) => emit('error', message, extra),
};
