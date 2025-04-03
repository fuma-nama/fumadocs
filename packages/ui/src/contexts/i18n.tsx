'use client';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export interface Translations {
  search: string;
  searchNoResult: string;

  toc: string;
  tocNoHeadings: string;

  lastUpdate: string;
  chooseLanguage: string;
  nextPage: string;
  previousPage: string;
  chooseTheme: string;
  editOnGithub: string;
}

export interface LocaleItem {
  name: string;
  locale: string;
}

interface I18nContextType {
  locale?: string;
  onChange?: (v: string) => void;
  text: Translations;
  locales?: LocaleItem[];
}

export const defaultTranslations: Translations = {
  search: 'Search',
  searchNoResult: 'No results found',
  toc: 'On this page',
  tocNoHeadings: 'No Headings',
  lastUpdate: 'Last updated on',
  chooseLanguage: 'Choose a language',
  nextPage: 'Next Page',
  previousPage: 'Previous Page',
  chooseTheme: 'Theme',
  editOnGithub: 'Edit on GitHub',
};

export const I18nContext = createContext<I18nContextType>({
  text: defaultTranslations,
});

export function I18nLabel(props: { label: keyof Translations }): string {
  const { text } = useI18n();

  return text[props.label];
}

export function useI18n(): I18nContextType {
  return useContext(I18nContext);
}

export interface I18nProviderProps {
  /**
   * Current locale
   */
  locale: string;

  /**
   * Handle changes to the locale, redirect user when not specified.
   */
  onLocaleChange?: (v: string) => void;

  /**
   * Translations of current locale
   */
  translations?: Partial<Translations>;

  /**
   * Available languages
   */
  locales?: LocaleItem[];

  children?: ReactNode;
}

export function I18nProvider({
  locales = [],
  locale,
  onChange: _onChange,
  onLocaleChange = _onChange,
  ...props
}: I18nProviderProps & {
  // TODO: remove next major
  /**
   * @deprecated use `onLocaleChange` instead
   */
  onChange?: I18nProviderProps['onLocaleChange'];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const onChange = useEffectEvent((value: string) => {
    if (onLocaleChange) {
      return onLocaleChange(value);
    }
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
      value={useMemo(
        () => ({
          locale,
          locales,
          text: {
            ...defaultTranslations,
            ...props.translations,
          },
          onChange,
        }),
        [locale, locales, onChange, props.translations],
      )}
    >
      {props.children}
    </I18nContext.Provider>
  );
}
