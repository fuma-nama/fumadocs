/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useParams,
} from '@tanstack/react-router';
import * as React from 'react';
import appCss from '@/styles/app.css?url';
import { RootProvider } from 'fumadocs-ui/provider/base';
import { TanstackProvider } from 'fumadocs-core/framework/tanstack';
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';

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

const { provider } = defineI18nUI(i18n, {
  translations: {
    cn: {
      displayName: 'Chinese',
      search: 'Translated Content',
    },
    en: {
      displayName: 'English',
    },
  },
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const { lang = i18n.defaultLanguage } = useParams({ strict: false });

  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <TanstackProvider>
          <RootProvider i18n={provider(lang)}>{children}</RootProvider>
        </TanstackProvider>
        <Scripts />
      </body>
    </html>
  );
}
