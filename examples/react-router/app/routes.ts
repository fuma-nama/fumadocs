import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('docs/*', 'routes/docs.tsx'),
  route('api/search', 'routes/search.ts'),
  route('og/docs/*', 'routes/og.docs.tsx'),

  route('*', 'routes/not-found.tsx'),
  route('llms.txt', 'routes/llms.txt.ts'),
  route('llms-full.txt', 'routes/llms-full.txt.ts'),
  route('llms.mdx/*', 'routes/llms.mdx.ts'),
] satisfies RouteConfig;
