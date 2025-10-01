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
