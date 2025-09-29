import { createMarkdownMiddleware } from 'fumadocs-core/http/middleware/next';

export const middleware = createMarkdownMiddleware({
  resolver: {
    redirectOptions: {
      target: '/llms.mdx',
      sourceBase: '/docs',
    },
  },
});

export const config = {
  matcher: ['/docs/:path*'],
}