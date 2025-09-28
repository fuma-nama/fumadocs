import { index, route, type RouteConfigEntry } from '@react-router/dev/routes';

export default getRoutes();

export function getRoutes(): RouteConfigEntry[] {
  return [
    index('routes/home.tsx'),
    route('docs/*', 'docs/page.tsx'),
    route('api/search', 'docs/search.ts'),
  ];
}
