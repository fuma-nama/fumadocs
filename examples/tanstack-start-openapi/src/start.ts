import { createMiddleware, createStart } from '@tanstack/react-start';
import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { redirect } from '@tanstack/react-router';
import { docsRoute } from '@/lib/shared';
import { slugsToMarkdownPath } from './lib/source';

const llmMiddleware = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);

  if (
    url.pathname.startsWith(docsRoute) &&
    !url.pathname.endsWith('.md') &&
    isMarkdownPreferred(request)
  ) {
    const slugs = url.pathname
      .slice(docsRoute.length)
      .split('/')
      .filter((v) => v.length > 0);
    url.pathname = slugsToMarkdownPath(slugs).url;

    throw redirect(url);
  }

  return next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [llmMiddleware],
  };
});
