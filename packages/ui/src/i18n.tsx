'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import { useMemo } from 'react';
import {
  defaultTranslations,
  I18nContext,
  type Translations,
} from '@/contexts/i18n';
import type { I18nProviderProps } from './provider/base';
import type { I18nConfig } from 'fumadocs-core/i18n';

export type { I18nProviderProps, Translations };
export { defaultTranslations } from './contexts/i18n';

// TODO: remove next major
/**
 * @deprecated legacy I18n Provider, use `<RootProvider i18n={...} />` instead
 */
export function I18nProvider({
  locales = [],
  locale,
  onChange: _onChange,
  onLocaleChange = _onChange,
  ...props
}: I18nProviderProps & {
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

export function defineI18nUI<Languages extends string>(
  config: I18nConfig<Languages>,
  options: {
    translations: {
      [K in Languages]?: Partial<Translations> & { displayName?: string };
    };
  },
) {
  const { translations } = options;

  return {
    provider(locale: string = config.defaultLanguage): I18nProviderProps {
      return {
        locale,
        translations: translations[locale as Languages],
        locales: config.languages.map((locale) => ({
          locale,
          name: translations[locale]?.displayName ?? locale,
        })),
      };
    },
  };
}
