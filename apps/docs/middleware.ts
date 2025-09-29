import { createMarkdownMiddleware } from 'fumadocs-core/http/middleware/next';

export const middleware = createMarkdownMiddleware({
  resolver: {
    redirectOptions: {
      markdownExtension: '.mdx',
    },
  },
});

export const config = {
  matcher: ['/docs/:path*'],
}