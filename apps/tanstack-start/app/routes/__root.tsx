import { type ReactNode, useMemo } from 'react';
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useLocation,
  useParams,
  useRouter,
  Link,
} from '@tanstack/react-router';
import { RootProvider } from 'fumadocs-ui/provider/base';
import { type Framework, FrameworkProvider } from 'fumadocs-core/framework';
// @ts-expect-error -- import CSS
import appCss from '../app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Fumadocs on TanStack Start',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <Provider>
          {children}
          <Scripts />
        </Provider>
      </body>
    </html>
  );
}

function Provider({ children }: { children: ReactNode }) {
  const framework = useMemo<Framework>(
    () => ({
      Link({ href, prefetch, ...props }) {
        return (
          <Link to={href} preload={prefetch ? 'intent' : false} {...props}>
            {props.children}
          </Link>
        );
      },
      usePathname() {
        return useLocation().pathname;
      },
      useRouter() {
        const router = useRouter();

        return {
          push(url) {
            void router.navigate({
              href: url,
            });
          },
          refresh() {
            void router.invalidate();
          },
        };
      },
      useParams() {
        return useParams({
          from: '__root__',
        });
      },
    }),
    [],
  );

  return (
    <FrameworkProvider {...framework}>
      <RootProvider>{children}</RootProvider>
    </FrameworkProvider>
  );
}
