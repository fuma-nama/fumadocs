'use client';
import { createContext, type ReactNode, use, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'fumadocs-core/framework';
import { renderTranslation, TranslationValue, type TranslationObject } from 'fumadocs-core/i18n';
import { defaultTranslations, type Translations } from '@/i18n';

interface LocaleItem {
  name: string;
  locale: string;
}

interface I18nContextType {
  text: Translations & Record<string, string | Record<string, string>>;
  locale?: string;
  onChange?: (v: string) => void;
  locales?: LocaleItem[];
}

const I18nContext = createContext<I18nContextType>({
  text: defaultTranslations,
});

export function I18nLabel<K extends keyof Translations = keyof Translations>({
  label,
  params,
}: {
  label: K;
  params?: Translations[K] extends TranslationValue<infer Params> ? Record<Params, string> : never;
}): string {
  const t = useTranslations();
  return renderTranslation(t[label], params!);
}

export function useI18n(): I18nContextType {
  return use(I18nContext);
}

export function useTranslations(): Translations;
export function useTranslations<Obj extends TranslationObject>(namespace: string): Obj | undefined;

export function useTranslations(namespace?: string) {
  return namespace ? use(I18nContext).text[namespace] : use(I18nContext).text;
}

export interface I18nProviderProps {
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
  translations?: Partial<I18nContextType['text']>;

  /**
   * Available languages
   */
  locales?: LocaleItem[];

  children?: ReactNode;
}

export function I18nProvider({
  locales = [],
  locale,
  onLocaleChange,
  children,
  translations,
}: I18nProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const onChange = (value: string) => {
    if (onLocaleChange) {
      return onLocaleChange(value);
    }
    const segments = pathname.split('/').filter((v) => v.length > 0);

    // If locale prefix hidden
    if (segments.length === 0 || segments[0] !== locale) {
      segments.unshift(value);
    } else {
      segments[0] = value;
    }

    router.push(`/${segments.join('/')}`);
  };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  return (
    <I18nContext
      value={useMemo(
        () => ({
          locale,
          locales,
          text: {
            ...defaultTranslations,
            ...translations,
          },
          onChange: (v) => onChangeRef.current(v),
        }),
        [locale, locales, translations],
      )}
    >
      {children}
    </I18nContext>
  );
}
