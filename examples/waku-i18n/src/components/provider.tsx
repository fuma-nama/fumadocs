'use client';
import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/waku';
import { i18nProvider } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';
import { useRouter } from 'waku/router/client';

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
        'Search(search dialog input placeholder)': 'Search (Translated)',
      },
    };
  }

  return { locale, locales };
}

export function Provider({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <RootProvider i18n={i18nProvider(i18nProps(router.path.split('/')[1] ?? i18n.defaultLanguage))}>
      {children}
    </RootProvider>
  );
}
