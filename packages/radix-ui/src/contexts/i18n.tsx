'use client';
import { createContext, type ReactNode, use, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'fumadocs-core/framework';
import type { I18nConfig } from 'fumadocs-core/i18n';
import { TranslationProvider } from '@fuma-translate/react';

interface LocaleItem {
  name: string;
  locale: string;
}

interface LocaleContextType {
  locale?: string;
  onChange?: (v: string) => void;
  locales?: LocaleItem[];
}

const LocaleContext = createContext<LocaleContextType>({});

export function useI18n(): LocaleContextType {
  return use(LocaleContext);
}

export interface I18nProviderProps extends Partial<
  Pick<I18nConfig, 'defaultLanguage' | 'hideLocale'>
> {
  /**
   * Current locale
   */
  locale?: string;

  /**
   * Handle changes to the locale, redirect user when not specified.
   */
  onLocaleChange?: (v: string) => void;

  /**
   * Translations of current locale
   */
  translations?: Partial<Record<string, string>>;

  /**
   * Available languages
   */
  locales?: LocaleItem[];

  children?: ReactNode;
}

const Empty = {};

export function I18nProvider({
  locales = [],
  locale,
  defaultLanguage,
  hideLocale = 'never',
  onLocaleChange,
  children,
  translations = Empty,
}: I18nProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const onChange = (value: string) => {
    if (onLocaleChange) {
      return onLocaleChange(value);
    }
    let path = pathname;
    if (hideLocale === 'never' || (hideLocale === 'default-locale' && locale !== defaultLanguage)) {
      const end = pathname.indexOf('/', 1);
      path = end === -1 ? '/' : pathname.slice(end);
    }

    // With `always`, middleware uses the prefix to update the locale cookie before redirecting.
    if (hideLocale !== 'default-locale' || value !== defaultLanguage) {
      path = `/${value}${path === '/' ? '' : path}`;
    }

    router.push(path);
  };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  return (
    <LocaleContext
      value={useMemo(
        () => ({
          locale,
          locales,
          onChange: (v) => onChangeRef.current(v),
        }),
        [locale, locales],
      )}
    >
      <TranslationProvider translations={translations}>{children}</TranslationProvider>
    </LocaleContext>
  );
}
