'use client';
import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/waku';
import { i18nProvider, uiTranslations } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';
import { useRouter } from 'waku/router/client';

const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add('ui', {
    en: {
      displayName: 'English',
    },
    cn: {
      displayName: 'Chinese',
      search: 'Search (Translated)',
    },
  });

export function Provider({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <RootProvider i18n={i18nProvider(translations, router.path.split('/')[1])}>
      {children}
    </RootProvider>
  );
}
