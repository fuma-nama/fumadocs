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
  // TODO: make required (next major)
  /**
   * Force a locale, by default, it is parsed from pathname
   *
   * **Highly recommended to specify one**
   */
  locale?: string;

  // TODO: only pass the current translation, reduce client bundle size
  /**
   * Translations for each language
   */
  translations?: Record<string, NamedTranslation>;

  /**
   * Handle changes to the locale, redirect user when not specified.
   */
  onChange?: (v: string) => void;

  children: ReactNode;
}

export function I18nProvider({
  translations = {},
  ...props
}: I18nProviderProps): React.ReactElement {
  const context = useI18n();
  const router = useRouter();
  const segments = usePathname()
    .split('/')
    .filter((v) => v.length > 0);

  const locale = props.locale ?? segments[0];
  const onChange = useCallback(
    (v: string) => {
      // If locale prefix hidden
      if (segments[0] !== locale) {
        segments.unshift(v);
      } else {
        segments[0] = v;
      }

      router.push(`/${segments.join('/')}`);
    },
    [locale, segments, router],
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
        onChange: props.onChange ?? onChange,
      }}
    >
      {props.children}
    </I18nContext.Provider>
  );
}

export { type Translations };
