import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import type { NextMiddlewareResult } from 'next/dist/server/web/types';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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

export function createI18nMiddleware(
  request: NextRequest,
  languages: string[],
  defaultLanguage: string,
  format: (locale: string, slug: string) => string,
): NextMiddlewareResult | Promise<NextMiddlewareResult> {
  const { pathname } = request.nextUrl;

  const pathnameIsMissingLocale = languages.every(
    (locale) =>
      !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request, languages, defaultLanguage);
    let path = pathname;

    while (path.startsWith('/')) {
      path = path.slice(1);
    }

    return NextResponse.redirect(new URL(format(locale, path), request.url));
  }
}
