import type { NextMiddleware } from 'next/dist/server/web/types';
import type * as Middleware from './middleware';

export * from './index';

/**
 * From what I observed, Next.js will somehow pick "browser" export instead of "import" in middleware.
 * Hence, `createI18nMiddleware` is not available from `fumadocs-core/i18n`, even with compatibility layer.
 *
 * I hope Next.js will fix it in the future, before old projects bump deps and face errors.
 *
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
