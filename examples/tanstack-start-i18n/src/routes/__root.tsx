import { createRootRoute, HeadContent, Outlet, Scripts, useParams } from '@tanstack/react-router';
import * as React from 'react';
import appCss from '@/styles/app.css?url';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import { i18nProvider } from 'fumadocs-ui/i18n';
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

function i18nProps(locale: string) {
  const locales = i18n.languages.map((code) => ({
    locale: code,
    name: code === 'cn' ? 'Chinese' : 'English',
  }));

  if (locale === 'cn') {
    return {
      locale,
      locales,
      translations: {
        'Search(search dialog input placeholder)': 'Translated Content',
      },
    };
  }

  return { locale, locales };
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { lang = i18n.defaultLanguage } = useParams({ strict: false });

  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider i18n={i18nProvider(i18nProps(lang))}>{children}</RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
