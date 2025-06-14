import { route, type RouteConfig } from '@react-router/dev/routes';

export default [
  route(':lang?', 'routes/home.tsx'),
  route(':lang?/docs/*', './routes/docs/page.tsx'),
  route('api/search', './routes/docs/search.ts'),
] satisfies RouteConfig;
