'use client';
import { useMemo, type ReactNode } from 'react';
import { RootProvider, type RootProviderProps } from 'fumadocs-ui/provider/waku';
import type { I18nConfig } from '@/config';

export function Provider({
  locale,
  i18n,
  children,
}: {
  locale?: string;
  i18n?: I18nConfig;
  children: ReactNode;
}) {
  const i18nProp: RootProviderProps['i18n'] = useMemo(() => {
    if (!i18n) return;

    return {
      locale,
      locales: Object.entries(i18n.languages).map(([k, v]) => ({
        name: v.displayName,
        locale: k,
      })),
      translations: locale ? i18n.languages[locale]?.translations : undefined,
    };
  }, [locale]);

  return <RootProvider i18n={i18nProp}>{children}</RootProvider>;
}
