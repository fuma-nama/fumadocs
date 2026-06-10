import type { I18nProviderProps } from '@/contexts/i18n';
import type {
  I18nConfig,
  SingularTranslationsAPI,
  TranslationExtension,
  TranslationsAPI,
} from 'fumadocs-core/i18n';
import translationKeys from '@/.translations/keys.json';
import type { Translations } from '@/.translations';

export type { Translations };
export function uiTranslations(): TranslationExtension<keyof Translations> {
  return { keys: translationKeys as never };
}

export function i18nProvider(translations: SingularTranslationsAPI): I18nProviderProps;
export function i18nProvider<Languages extends string>(
  translations: TranslationsAPI<Languages>,
  lang?: NoInfer<Languages> | (string & {}),
): I18nProviderProps;

export function i18nProvider(
  translations: SingularTranslationsAPI | TranslationsAPI,
  lang?: string,
): I18nProviderProps {
  const t = translations.extend(uiTranslations());

  if ('config' in t) {
    const { defaultLanguage, languages } = t.config;
    const locale = lang ?? defaultLanguage;
    const values = t.get(locale) ?? t.get(defaultLanguage);

    return {
      locale: lang,
      translations: values,
      locales: languages.map((code) => ({
        locale: code,
        name: typeof values.displayName === 'string' ? values.displayName : code,
      })),
    };
  }

  return {
    translations: t.get(),
  };
}

export interface I18nUIConfig<Languages extends string> extends I18nConfig<Languages> {
  provider: (locale?: Languages | (string & {})) => I18nProviderProps;
}

export function defineI18nUI<Languages extends string>(
  config: I18nConfig<Languages>,
  localeTranslations: Partial<
    Record<Languages, Record<string, string> & { displayName?: string }>
  > = {},
): I18nUIConfig<Languages> {
  return {
    ...config,
    provider(locale = config.defaultLanguage) {
      const t = localeTranslations[locale as Languages];
      return {
        locale,
        translations: t,
        locales: config.languages.map((code) => ({
          locale: code,
          name: localeTranslations[code as Languages]?.displayName ?? code,
        })),
      };
    },
  };
}
