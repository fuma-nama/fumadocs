import type { MiddlewareHandler } from 'hono';
import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { docsLlms } from '@/lib/source';

/** serve the files of `docsLlms` at their paths, and docs pages as Markdown to clients that prefer it */
export default function llmsMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const file = await docsLlms.serve(c.req.path);
    if (file) return file;

    const markdown = isMarkdownPreferred(c.req.raw) && (await docsLlms.serve(`${c.req.path}.md`));
    if (markdown) {
      // this URL has two representations, selected by `Accept`
      markdown.headers.set('Vary', 'Accept');
      return markdown;
    }

    await next();
  };
}
