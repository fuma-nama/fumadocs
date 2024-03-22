'use client';

import type { SelectProps } from '@radix-ui/react-select';
import { useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useI18n,
  type Translations,
  I18nContext,
  type NamedTranslation,
} from './contexts/i18n';

export type LanguageSelectProps = Omit<SelectProps, 'value' | 'onValueChange'>;

export function LanguageSelect({
  ...props
}: LanguageSelectProps): React.ReactElement {
  const context = useI18n();
  if (!context.translations) throw new Error('Missing prop `translations`');

  const languages = Object.entries(context.translations);

  return (
    <Select value={context.locale} onValueChange={context.onChange} {...props}>
      <SelectTrigger>
        <SelectValue placeholder={context.text.chooseLanguage} />
      </SelectTrigger>
      <SelectContent>
        {languages.map(([lang, { name }]) => (
          <SelectItem key={lang} value={lang}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface I18nProviderProps {
  /**
   * Force a locale
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
