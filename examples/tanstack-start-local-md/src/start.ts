import { createMiddleware, createStart } from '@tanstack/react-start';
import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { redirect } from '@tanstack/react-router';
import { docsRoute } from '@/lib/shared';

const llmMiddleware = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);

  // files like `/docs/page.md` are served by their routes
  if (
    url.pathname.startsWith(docsRoute) &&
    !/\.(md|txt)$/.test(url.pathname) &&
    isMarkdownPreferred(request)
  ) {
    url.pathname += '.md';

    // this URL has two representations, selected by `Accept`
    throw redirect({ href: url.href, headers: { Vary: 'Accept' } });
  }

  return next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [llmMiddleware],
  };
});
