'use client';

import { useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  useI18n,
  type Translations,
  I18nContext,
  type LocaleItem,
} from './contexts/i18n';

interface I18nProviderProps {
  /**
   * Current locale
   */
  locale: string;

  /**
   * Translations of current locale
   */
  translations?: Partial<Translations>;

  /**
   * Available languages
   */
  locales?: LocaleItem[];

  /**
   * Handle changes to the locale, redirect user when not specified.
   */
  onChange?: (v: string) => void;

  children: ReactNode;
}

export function I18nProvider({
  locales = [],
  locale,
  ...props
}: I18nProviderProps) {
  const context = useI18n();
  const router = useRouter();
  const segments = usePathname()
    .split('/')
    .filter((v) => v.length > 0);

  const onChange = useCallback(
    (v: string) => {
      // If locale prefix hidden
      if (segments[0] !== locale) {
        segments.unshift(v);
      } else {
        segments[0] = v;
      }

      router.push(`/${segments.join('/')}`);
      router.refresh();
    },
    [locale, segments, router],
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        locales,
        text: {
          ...context.text,
          ...props.translations,
        },
        onChange: props.onChange ?? onChange,
      }}
    >
      {props.children}
    </I18nContext.Provider>
  );
}

export function I18nLabel(props: { label: keyof Translations }): string {
  const { text } = useI18n();

  return text[props.label];
}

export { type Translations };
