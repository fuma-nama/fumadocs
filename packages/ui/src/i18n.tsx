'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import { useMemo } from 'react';
import { defaultTranslations, I18nContext } from '@/contexts/i18n';
import type { I18nProviderProps } from './provider/base';

export type { I18nProviderProps };
export { defaultTranslations, type Translations } from './contexts/i18n';

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
  const pathname = decodeURIComponent(usePathname());
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
