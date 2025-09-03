'use client';
import type { ReactNode } from 'react';
import { WakuProvider } from 'fumadocs-core/framework/waku';
import { RootProvider } from 'fumadocs-ui/provider/base';
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';
import { useRouter } from 'waku/router/client';

const { provider } = defineI18nUI(i18n, {
  translations: {
    en: {
      displayName: 'English',
    },
    cn: {
      displayName: 'Chinese',
      search: 'Search (Translated)',
    },
  },
});

export function Provider({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <WakuProvider>
      <RootProvider i18n={provider(router.path.split('/')[1])}>
        {children}
      </RootProvider>
    </WakuProvider>
  );
}
