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

const COOKIE = 'FD_LOCALE';

function getLocale(
  request: NextRequest,
  locales: string[],
  defaultLanguage: string,
): string {
  // Negotiator expects plain object so we need to transform headers
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    negotiatorHeaders[key] = value;
  });

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
  function getUrl(
    request: NextRequest,
    pathname: string,
    locale?: string,
  ): URL {
    if (!locale) {
      return new URL(
        pathname.startsWith('/') ? pathname : `/${pathname}`,
        request.url,
      );
    }

    return new URL(
      format(locale, pathname.startsWith('/') ? pathname.slice(1) : pathname),
      request.url,
    );
  }

  return (request) => {
    const inputPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

    const pathLocale = languages.find(
      (locale) =>
        inputPath.startsWith(`/${locale}/`) || inputPath === `/${locale}`,
    );

    if (!pathLocale) {
      if (hideLocale === 'default-locale') {
        return NextResponse.rewrite(
          getUrl(request, inputPath, defaultLanguage),
        );
      }

      const preferred = getLocale(request, languages, defaultLanguage);

      if (hideLocale === 'always') {
        const locale = request.cookies.get(COOKIE)?.value ?? preferred;

        return NextResponse.rewrite(getUrl(request, inputPath, locale));
      }

      return NextResponse.redirect(getUrl(request, inputPath, preferred));
    }

    if (hideLocale === 'always') {
      const path = inputPath.slice(`/${pathLocale}`.length);

      const res = NextResponse.redirect(getUrl(request, path));
      res.cookies.set(COOKIE, pathLocale);
      return res;
    }

    // Remove explicit default locale
    // (Only possible for default locale)
    if (hideLocale === 'default-locale' && pathLocale === defaultLanguage) {
      return NextResponse.redirect(
        getUrl(request, inputPath.slice(`/${pathLocale}`.length)),
      );
    }

    return NextResponse.next();
  };
}
