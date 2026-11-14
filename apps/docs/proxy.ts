import { type NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';

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

/** generated API pages have no Markdown, they keep their HTML */
const apiPage = /^(?:\/[^/]+)?\/docs\/(?:openapi|asyncapi|graphql)\/./;

/** pages with a Markdown version, for clients that prefer Markdown */
const markdownVersions = new Map([
  ['/', '/index.md'],
  ['/showcase', '/showcase.md'],
]);

export const config = {
  // the docs and the pages with a Markdown version, the locale prefix is a rewrite in `next.config.mts`
  matcher: [
    '/',
    '/showcase',
    '/docs.md',
    '/docs.mdx',
    '/docs/:path*',
    '/:lang/docs.md',
    '/:lang/docs.mdx',
    '/:lang/docs/:path*',
  ],
};

export default function proxy(request: NextRequest) {
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

  return NextResponse.next();
}
