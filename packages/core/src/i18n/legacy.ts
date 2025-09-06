import type { NextMiddleware } from 'next/dist/server/web/types';
import type * as Middleware from './middleware';

export * from './index';

/**
 * @deprecated Import from `fumadocs-core/i18n/middleware` instead
 */
export const createI18nMiddleware: typeof Middleware.createI18nMiddleware = (
  ...args
): NextMiddleware => {
  console.warn(
    '[Fumadocs Core] Please import i18n middleware from `fumadocs-core/i18n/middleware` instead, this export will soon be removed.',
  );
  const middleware: Promise<NextMiddleware> = import('./middleware').then(
    (res) => res.createI18nMiddleware(...args),
  );

  return async (...args) => (await middleware)(...args);
};
