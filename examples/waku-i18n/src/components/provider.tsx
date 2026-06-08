'use client';
import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/waku';
import { i18nProvider, uiTranslations } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';
import { useRouter } from 'waku/router/client';
import { zhTW } from '@fumadocs/language/zh-tw';

const translations = i18n.translations().extend(uiTranslations()).preset('cn', zhTW());

export function Provider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const lang = router.path.split('/')[1] ?? i18n.defaultLanguage;

  return <RootProvider i18n={i18nProvider(translations, lang)}>{children}</RootProvider>;
}
