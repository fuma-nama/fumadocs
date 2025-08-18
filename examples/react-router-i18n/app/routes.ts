import { route, type RouteConfig } from '@react-router/dev/routes';

export default [
  route(':lang?', 'routes/home.tsx'),
  route(':lang?/docs/*', 'docs/page.tsx'),
  route('api/search', 'docs/search.ts'),
] satisfies RouteConfig;
