import type { unstable_RSCRouteConfig as RSCRouteConfig } from 'react-router';

export function routes() {
  return [
    {
      id: 'root',
      path: '',
      lazy: () => import('./root/index.js'),
      children: [
        {
          id: 'docs',
          path: '*?',
          lazy: () => import('./page.js'),
        },
        {
          id: 'api/search',
          path: 'api/search',
          lazy: () => import('./api/search.js'),
        },
      ],
    },
  ] satisfies RSCRouteConfig;
}
