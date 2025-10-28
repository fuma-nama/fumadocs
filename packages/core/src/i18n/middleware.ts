import { match as matchLocale } from '@formatjs/intl-localematcher';
import type { NextProxy } from 'next/dist/server/web/types';
import { type NextRequest, NextResponse } from 'next/server';
import type { I18nConfig } from '@/i18n';
import { getNegotiator } from '@/negotiation';

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
  const languages = getNegotiator(request).languages(locales);

  return matchLocale(languages, locales, defaultLanguage);
}

const defaultFormat: NonNullable<MiddlewareOptions['format']> = (
  locale,
  path,
) => {
  return `/${locale}${path}`;
};

export function createI18nMiddleware({
  languages,
  defaultLanguage,
  format = defaultFormat,
  hideLocale = 'never',
}: MiddlewareOptions): NextProxy {
  function getLocaleUrl(request: NextRequest, locale: string): URL {
    const next = new URL(request.url);
    next.pathname = format(locale, forceSlashPrefix(request.nextUrl.pathname));
    return next;
  }

  return (request) => {
    const url = request.nextUrl;
    const pathLocale = languages.find(
      (locale) =>
        url.pathname.startsWith(`/${locale}/`) || url.pathname === `/${locale}`,
    );

    if (!pathLocale) {
      if (hideLocale === 'default-locale') {
        return NextResponse.rewrite(getLocaleUrl(request, defaultLanguage));
      }

      const preferred = getLocale(request, languages, defaultLanguage);

      if (hideLocale === 'always') {
        const locale = request.cookies.get(COOKIE)?.value ?? preferred;

        return NextResponse.rewrite(getLocaleUrl(request, locale));
      }

      return NextResponse.redirect(getLocaleUrl(request, preferred));
    }

    // Remove explicit locale
    if (
      hideLocale === 'always' ||
      (hideLocale === 'default-locale' && pathLocale === defaultLanguage)
    ) {
      const res = NextResponse.redirect(
        new URL(
          forceSlashPrefix(url.pathname.slice(`/${pathLocale}`.length)),
          request.url,
        ),
      );
      res.cookies.set(COOKIE, pathLocale);
      return res;
    }

    return NextResponse.next();
  };
}

function forceSlashPrefix(v: string) {
  if (v.startsWith('/')) return v;
  return '/' + v;
}
