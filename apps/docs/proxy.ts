import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';

const { rewrite: rewriteLLM } = rewritePath('/docs/*path', '/llms.mdx/*path');
const { rewrite: rewriteMd } = rewritePath('/docs{/*path}.md{x}', '/llms.mdx{/*path}');

/** pages with a Markdown version, for clients that prefer Markdown */
const markdownVersions = new Map([
  ['/', '/index.md'],
  ['/showcase', '/showcase.md'],
]);

export default function proxy(request: NextRequest) {
  const result = rewriteMd(request.nextUrl.pathname);
  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl));
  }

  if (isMarkdownPreferred(request)) {
    const result =
      markdownVersions.get(request.nextUrl.pathname) ?? rewriteLLM(request.nextUrl.pathname);

    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl), {
        // this URL has two representations, selected by `Accept`
        headers: { Vary: 'Accept' },
      });
    }
  }

  return NextResponse.next();
}
