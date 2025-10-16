import type { unstable_RSCRouteConfig as RSCRouteConfig } from 'react-router';
import config from 'virtual:app/routes';

export async function routes() {
  const root = config.root ?? {
    id: 'root',
    path: '',
    lazy: () => import('./root/index.js'),
  };

  return [
    {
      ...root,
      children: [
        {
          id: 'docs',
          path: '*?',
          lazy: () => import('./docs/page.js'),
        },
        {
          id: 'api/search',
          path: 'api/search',
          lazy: () => import('./docs/search.js'),
        },
      ],
    },
  ] satisfies RSCRouteConfig;
}
