import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { i18n } from '@/lib/i18n';

const { rewrite: rewriteLLM } = rewritePath(
  '{/:lang}/docs{/*path}',
  '/llms.mdx{/:lang}/docs{/*path}.md',
);
const { rewrite: rewriteMd } = rewritePath(
  '{/:lang}/docs{/*path}.md{x}',
  '/llms.mdx{/:lang}/docs{/*path}.md',
);
const { rewrite: rewriteText } = rewritePath(
  '{/:lang}/docs{/*path}.txt',
  '/llms.mdx{/:lang}/docs{/*path}.txt',
);
const i18nProxy = createI18nMiddleware(i18n);

/** generated API pages have no Markdown, they keep their HTML */
const apiPage = /^(?:\/[^/]+)?\/docs\/(?:openapi|asyncapi|graphql)\/./;

/** pages with a Markdown version, for clients that prefer Markdown */
const markdownVersions = new Map([
  ['/', '/index.md'],
  ['/showcase', '/showcase.md'],
]);

export const config = {
  // pages and their text files: API routes (like MCP streams) and other files never pass through it
  matcher: '/((?!api/|_next/|og/|llms\\.mdx/|export/|.*\\.(?!mdx?$|txt$)[^/]+$).*)',
};

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const result = rewriteMd(pathname) || rewriteText(pathname);
  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl));
  }

  if (isMarkdownPreferred(request) && !apiPage.test(pathname)) {
    const result = markdownVersions.get(pathname) ?? rewriteLLM(pathname);

    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl), {
        // this URL has two representations, selected by `Accept`
        headers: { Vary: 'Accept' },
      });
    }
  }

  // files outside the docs, like `/llms.txt`, have no locale
  if (pathname.includes('.')) return NextResponse.next();
  return i18nProxy(request, event);
}
