import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import type { NextMiddleware } from 'next/dist/server/web/types';
import { type NextRequest, NextResponse } from 'next/server';
import type { I18nConfig } from '@/i18n';

interface MiddlewareOptions extends I18nConfig {
  /**
   * A function that adds the locale prefix to path name
   */
  format?: (locale: string, path: string) => string;
}

function getLocale(
  request: NextRequest,
  locales: string[],
  defaultLanguage: string,
): string {
  // Negotiator expects plain object so we need to transform headers
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  // Use negotiator and intl-localematcher to get best locale
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages(
    locales,
  );

  return matchLocale(languages, locales, defaultLanguage);
}

const defaultFormat: NonNullable<MiddlewareOptions['format']> = (
  locale,
  path,
) => {
  return `/${locale}/${path}`;
};

export function createI18nMiddleware({
  languages,
  defaultLanguage,
  format = defaultFormat,
  hideLocale = 'never',
}: MiddlewareOptions): NextMiddleware {
  function shouldHideLocale(locale: string): boolean {
    return (
      hideLocale === 'always' ||
      (hideLocale === 'default-locale' && locale === defaultLanguage)
    );
  }

  return (request) => {
    const { pathname } = request.nextUrl;

    const pathLocale = languages.find(
      (locale) =>
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
    );

    if (!pathLocale) {
      const locale = getLocale(request, languages, defaultLanguage);
      let path = pathname;

      while (path.startsWith('/')) {
        path = path.slice(1);
      }

      const url = new URL(format(locale, path), request.url);
      return shouldHideLocale(locale)
        ? NextResponse.rewrite(url)
        : NextResponse.redirect(url);
    }

    // Remove explicit default locale
    // (Only possible for default locale)
    if (hideLocale === 'default-locale' && pathLocale === defaultLanguage) {
      const path = pathname.slice(`/${pathLocale}`.length);

      return NextResponse.redirect(
        new URL(path.startsWith('/') ? path : `/${path}`, request.url),
      );
    }

    return NextResponse.next();
  };
}
