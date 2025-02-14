'use client';

import { type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  useI18n,
  type Translations,
  I18nContext,
  defaultTranslations,
  type LocaleItem,
} from './contexts/i18n';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';

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
  const pathname = usePathname();

  const onChange = useEffectEvent((value: string) => {
    const segments = pathname.split('/').filter((v) => v.length > 0);

    // If locale prefix hidden
    if (segments[0] !== locale) {
      segments.unshift(value);
    } else {
      segments[0] = value;
    }

    router.push(`/${segments.join('/')}`);
    router.refresh();
  });

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

export { defaultTranslations, type Translations };
