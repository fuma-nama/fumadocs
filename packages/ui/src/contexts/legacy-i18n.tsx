'use client';
// TODO: remove next major
import type { I18nProviderProps } from '@/provider/base';
import { usePathname, useRouter } from 'fumadocs-core/framework';
import { useMemo, useRef } from 'react';
import { defaultTranslations, I18nContext } from '@/contexts/i18n';

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
  const onChange =
    onLocaleChange ??
    ((value: string) => {
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
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
          onChange: (v) => onChangeRef.current(v),
        }),
        [locale, locales, props.translations],
      )}
    >
      {props.children}
    </I18nContext.Provider>
  );
}
