import type { I18nProviderProps, Translations } from '@/contexts/i18n';
import type { I18nConfig } from 'fumadocs-core/i18n';

export { defaultTranslations, type I18nProviderProps, type Translations } from '@/contexts/i18n';

export interface I18nUIConfig<Languages extends string> extends I18nConfig<Languages> {
  /**
   * get i18n config for Fumadocs UI `<RootProvider i18n={config} />`.
   */
  provider: (locale?: string) => I18nProviderProps;
}

export function defineI18nUI<Languages extends string>(
  config: I18nConfig<Languages>,
  options: {
    translations: {
      [K in Languages]?: Partial<Translations> & { displayName?: string };
    };
  },
): I18nUIConfig<Languages> {
  const { translations } = options;

  return {
    ...config,
    provider(locale = config.defaultLanguage) {
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
