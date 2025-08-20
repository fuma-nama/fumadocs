import type { Translations } from '@/contexts/i18n';
import type { I18nProviderProps } from './provider/base';
import type { I18nConfig } from 'fumadocs-core/i18n';

export type { I18nProviderProps, Translations };
export { defaultTranslations } from './contexts/i18n';
export { I18nProvider } from './contexts/legacy-i18n';

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
