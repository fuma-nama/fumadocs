import { createMiddleware, createStart } from '@tanstack/react-start';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { redirect } from '@tanstack/react-router';
import { docsContentRoute, docsRoute } from '@/lib/shared';

const { rewrite: rewriteDocs } = rewritePath(
  `${docsRoute}{/*path}`,
  `${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteSuffix } = rewritePath(
  `${docsRoute}{/*path}.mdx`,
  `${docsContentRoute}{/*path}/content.md`,
);

const llmMiddleware = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);
  const path = rewriteSuffix(url.pathname);

  if (path) {
    throw redirect(new URL(path, url));
  }

  if (isMarkdownPreferred(request)) {
    const docsPath = rewriteDocs(url.pathname);
    if (docsPath) {
      throw redirect(new URL(docsPath, url));
    }
  }

  return next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [llmMiddleware],
  };
});
