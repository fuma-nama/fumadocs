import type { I18nProviderProps, Translations } from '@/contexts/i18n';
import type { I18nConfig } from 'fumadocs-core/i18n';

export { defaultTranslations, type I18nProviderProps, type Translations } from '@/contexts/i18n';

export interface I18nUIConfig<Languages extends string> extends I18nConfig<Languages> {
  /**
   * get i18n config for Fumadocs UI `<RootProvider i18n={config} />`.
   */
  provider: (locale?: Languages | (string & {})) => I18nProviderProps;
}

type TranslationsConfig<Languages extends string> = {
  [K in Languages]?: Partial<Translations> & { displayName?: string };
};

export function defineI18nUI<Languages extends string>(
  config: I18nConfig<Languages>,
  options:
    | {
        /**
         * @deprecated you can directly define the translations in outer scope (the parent object of `translations`)
         */
        translations: TranslationsConfig<Languages>;
      }
    | TranslationsConfig<Languages> = {},
): I18nUIConfig<Languages> {
  const translations = 'translations' in options ? options.translations : options;

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
