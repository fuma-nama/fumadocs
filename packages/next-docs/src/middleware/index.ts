import { match as matchLocale } from "@formatjs/intl-localematcher";
import { NextRequest, NextResponse } from "next/server";
import Negotiator from "negotiator";

function getLocale(
    request: NextRequest,
    locales: string[],
    defaultLanguage: string
): string {
    // Negotiator expects plain object so we need to transform headers
    const negotiatorHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

    // Use negotiator and intl-localematcher to get best locale
    const languages = new Negotiator({ headers: negotiatorHeaders }).languages(
        locales
    );

    return matchLocale(languages, locales, defaultLanguage);
}

export function createI18nMiddleware(
    request: NextRequest,
    languages: string[],
    defaultLanguage: string,
    format: (locale: string, slug: string) => string
) {
    const pathname = request.nextUrl.pathname;

    const pathnameIsMissingLocale = languages.every(
        (locale) =>
            !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    if (pathnameIsMissingLocale) {
        const locale = getLocale(request, languages, defaultLanguage);
        let path = pathname;

        while (path.startsWith("/")) {
            path = path.slice(1);
        }

        return NextResponse.redirect(
            new URL(format(locale, path), request.url)
        );
    }
}
