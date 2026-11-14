import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';

const { rewrite: rewriteLLM } = rewritePath('/docs{/*path}', '/llms.mdx/docs{/*path}.md');
const { rewrite: rewriteMd } = rewritePath('/docs{/*path}.md{x}', '/llms.mdx/docs{/*path}.md');
const { rewrite: rewriteFull } = rewritePath(
  '/docs{/*path}/llms-full.txt',
  '/llms.mdx/docs{/*path}/llms-full.txt',
);

/** generated API pages have no Markdown, they keep their HTML */
const apiPage = /^\/docs\/(?:openapi|asyncapi|graphql)\/./;

/** pages with a Markdown version, for clients that prefer Markdown */
const markdownVersions = new Map([
  ['/', '/index.md'],
  ['/showcase', '/showcase.md'],
]);

export const config = {
  matcher: ['/', '/showcase', '/docs.md', '/docs.mdx', '/docs/:path*'],
};

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const result = rewriteMd(pathname) || rewriteFull(pathname);
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
