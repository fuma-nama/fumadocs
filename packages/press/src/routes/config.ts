import type { unstable_RSCRouteConfig as RSCRouteConfig } from 'react-router';

export function routes() {
  return [
    {
      id: 'root',
      path: '',
      lazy: () => import('./root'),
      children: [
        {
          id: 'home',
          index: true,
          lazy: () => import('./home'),
        },
        {
          id: 'docs/*',
          path: 'docs/*',
          lazy: () => import('./docs/page'),
        },
      ],
    },
  ] satisfies RSCRouteConfig;
}
