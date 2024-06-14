'use client';

import { useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  useI18n,
  type Translations,
  I18nContext,
  type NamedTranslation,
} from './contexts/i18n';

interface I18nProviderProps {
  /**
   * Force a locale, by default, it is parsed from pathname
   */
  locale?: string;

  /**
   * Translations for each language
   */
  translations?: Record<string, NamedTranslation>;

  children: ReactNode;
}

export function I18nProvider({
  translations = {},
  locale: forceLocale,
  children,
}: I18nProviderProps): React.ReactElement {
  const localeIndex = 1;
  const router = useRouter();
  const pathname = usePathname();
  const context = useI18n();
  const segments = pathname.split('/');

  const locale = forceLocale ?? segments[localeIndex];
  const onChange = useCallback(
    (v: string) => {
      segments[localeIndex] = v; // update parameter

      router.push(segments.join('/'));
    },
    [segments, router],
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        translations,
        text: {
          ...context.text,
          ...translations[locale],
        },
        onChange,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export { type Translations };
