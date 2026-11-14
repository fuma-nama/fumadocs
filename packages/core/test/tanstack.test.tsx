import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterContextProvider,
} from '@tanstack/react-router';
import { usePathname } from '@/framework';
import { TanstackProvider } from '@/framework/tanstack';

function Pathname() {
  return usePathname();
}

test('usePathname() of components that mount while the next page loads', async () => {
  const loader = Promise.withResolvers<void>();
  const rootRoute = createRootRoute();
  const router = createRouter({
    isServer: false,
    origin: 'http://localhost',
    history: createMemoryHistory({ initialEntries: ['/a'] }),
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: '/a' }),
      createRoute({ getParentRoute: () => rootRoute, path: '/b', loader: () => loader.promise }),
    ]),
  });
  const render = () =>
    renderToStaticMarkup(
      <RouterContextProvider router={router}>
        <TanstackProvider>
          <Pathname />
        </TanstackProvider>
      </RouterContextProvider>,
    );

  await router.load();
  const navigation = router.navigate({ to: '/b' });
  await vi.waitFor(() => expect(router.state.isLoading).toBe(true));
  expect(render()).toBe('/a');

  loader.resolve();
  await navigation;
  expect(render()).toBe('/b');
});
