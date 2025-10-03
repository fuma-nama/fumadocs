import type { unstable_RSCRouteConfig as RSCRouteConfig } from 'react-router';

export async function routes() {
  const { default: config } = await import('virtual:app/routes');
  const root = config.root ?? {
    id: 'root',
    path: '',
    lazy: () => import('./root'),
  };

  return [
    {
      ...root,
      children: [
        {
          id: 'docs',
          path: '*?',
          lazy: () => import('./docs/page'),
        },
        {
          id: 'api/search',
          path: 'api/search',
          lazy: () => import('./docs/search'),
        },
      ],
    },
  ] satisfies RSCRouteConfig;
}
