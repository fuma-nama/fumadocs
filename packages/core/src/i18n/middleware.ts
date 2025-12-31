import { match as matchLocale } from '@formatjs/intl-localematcher';
import { type NextProxy, NextResponse } from 'next/server';
import type { I18nConfig } from '@/i18n';
import { getNegotiator } from '@/negotiation';
import type { NextURL } from 'next/dist/server/web/next-url';

interface MiddlewareOptions extends I18nConfig {
  /**
   * Either:
   * - A formatter object
   * - A function that adds the locale prefix to pathname
   */
  format?: URLFormatter | ((locale: string, pathname: string) => string);

  /**
   * the cookie to store locale code when `hideLocale` is set to `always`.
   */
  cookieName?: string;
}

export interface URLFormatter {
  /**
   * get locale code from request URL
   */
  get: (url: NextURL) => string | undefined;

  /**
   * add locale code to request URL (which is missing the locale).
   */
  add: (url: NextURL, locale: string) => URL;

  /**
   * remove locale code from request URL
   */
  remove: (url: NextURL) => URL;
}

export const DefaultFormatter: URLFormatter = {
  get(url) {
    const segs = url.pathname.split('/');
    if (segs.length > 1 && segs[1]) return segs[1];
  },
  add(url, locale) {
    const next = new URL(url);
    next.pathname = `${url.basePath}/${locale}/${url.pathname}`.replaceAll(/\/+/g, '/');
    return next;
  },
  remove(url) {
    const next = new URL(url);
    const pathname = url.pathname.split('/').slice(2).join('/');
    next.pathname = `${url.basePath}/${pathname}`.replaceAll(/\/+/g, '/');
    return next;
  },
};

export function createI18nMiddleware({
  languages,
  defaultLanguage,
  format = DefaultFormatter,
  cookieName = 'FD_LOCALE',
  hideLocale = 'never',
}: MiddlewareOptions): NextProxy {
  let formatter: URLFormatter;
  if (typeof format === 'function') {
    formatter = {
      ...DefaultFormatter,
      add(url, locale) {
        const next = new URL(url);
        next.pathname = format(locale, url.pathname);
        return next;
      },
    };
  } else {
    formatter = format;
  }

  return (request) => {
    const url = request.nextUrl;
    let pathLocale = formatter.get(url);
    if (pathLocale && !languages.includes(pathLocale)) pathLocale = undefined;

    if (!pathLocale) {
      if (hideLocale === 'default-locale') {
        return NextResponse.rewrite(formatter.add(url, defaultLanguage));
      }

      const finalLanguages = getNegotiator(request).languages(languages);
      const preferred = matchLocale(finalLanguages, languages, defaultLanguage);
      if (hideLocale === 'always') {
        const locale = request.cookies.get(cookieName)?.value ?? preferred;

        return NextResponse.rewrite(formatter.add(url, locale));
      }

      return NextResponse.redirect(formatter.add(url, preferred));
    }

    // Remove explicit locale
    if (
      hideLocale === 'always' ||
      (hideLocale === 'default-locale' && pathLocale === defaultLanguage)
    ) {
      const res = NextResponse.redirect(formatter.remove(url));
      res.cookies.set(cookieName, pathLocale);
      return res;
    }

    return NextResponse.next();
  };
}
