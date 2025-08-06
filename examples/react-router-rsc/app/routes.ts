import type { unstable_RSCRouteConfig as RSCRouteConfig } from 'react-router';

export function routes() {
  return [
    {
      id: 'root',
      path: '',
      lazy: () => import('./root/route'),
      children: [
        {
          id: 'home',
          index: true,
          lazy: () => import('./home/route'),
        },
        {
          id: 'docs',
          path: 'docs/*',
          lazy: () => import('./docs/page'),
        },
      ],
    },
    {
      id: 'search',
      path: 'api/search',
      lazy: () => import('./docs/search'),
    },
  ] satisfies RSCRouteConfig;
}
