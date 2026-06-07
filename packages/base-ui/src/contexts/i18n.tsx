'use client';
import { createContext, type ReactNode, use, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'fumadocs-core/framework';
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

export interface I18nProviderProps {
  locale?: string;
  onLocaleChange?: (v: string) => void;
  translations?: Partial<Record<string, string>>;
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
      <TranslationProvider translations={(translations ?? {}) as Record<string, string>}>
        {children}
      </TranslationProvider>
    </LocaleContext>
  );
}
