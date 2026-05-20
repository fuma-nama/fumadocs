import { defaultTranslations, type I18nProviderProps, type Translations } from '@/contexts/i18n';
import type { I18nConfig, TranslationsAPI } from 'fumadocs-core/i18n';

export { defaultTranslations, type I18nProviderProps, type Translations } from '@/contexts/i18n';

type TranslationsConfig<Languages extends string> = {
  [K in Languages]?: Partial<Translations>;
};

export function uiTranslations(): {
  namespace: 'ui';
  defaultValues: Translations;
} {
  return {
    namespace: 'ui',
    defaultValues: defaultTranslations,
  };
}

export function i18nProvider<
  Languages extends string,
  P extends {
    ui: Translations;
  },
>(
  translations: TranslationsAPI<Languages, P>,
  lang: Languages | (string & {}) = translations.config.defaultLanguage,
): I18nProviderProps {
  const { ui, ...rest } =
    translations.get(lang) ?? translations.get(translations.config.defaultLanguage);

  return {
    locale: lang,
    translations: { ...ui, ...rest },
    locales: translations.config.languages.map((locale) => ({
      locale,
      name: translations.get(locale).ui.displayName ?? locale,
    })),
  };
}

export interface I18nUIConfig<Languages extends string> extends I18nConfig<Languages> {
  /**
   * get i18n config for Fumadocs UI `<RootProvider i18n={config} />`.
   */
  provider: (locale?: Languages | (string & {})) => I18nProviderProps;
}

/** @deprecated use the `defineTranslations()` & `uiTranslations()` APIs instead */
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
