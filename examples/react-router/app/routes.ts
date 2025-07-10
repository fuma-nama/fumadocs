import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('/openapi', 'routes/openapi.tsx'),
  route('docs/*', 'docs/page.tsx'),
  route('api/search', 'docs/search.ts'),
] satisfies RouteConfig;
