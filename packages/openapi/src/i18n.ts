import translationKeys from '@/.translations/keys.json';
import type { TranslationExtension } from 'fumadocs-core/i18n';
import type { Translations } from '@/.translations';
import {
  type Translations as SharedTranslations,
  apiDocsTranslations,
} from '@fumadocs/api-docs/i18n';
import type { I18nUIConfig } from 'fumadocs-ui/i18n';

export type { Translations };
export function openapiTranslations(): TranslationExtension<
  keyof Translations | keyof SharedTranslations
> {
  const shared = apiDocsTranslations();
  return { keys: [...shared.keys, ...translationKeys] as never };
}

/** @deprecated use `i18n.translations()` & `openapiTranslations()` instead */
export function defineI18nOpenAPI<Languages extends string>(
  config: I18nUIConfig<Languages>,
  translations: Partial<Record<NoInfer<Languages>, Partial<Translations>>>,
): I18nUIConfig<Languages> {
  return {
    ...config,
    provider(locale = config.defaultLanguage) {
      const out = config.provider(locale);
      const data = translations[locale as Languages];
      if (data) {
        out.translations = { ...out.translations, ...data };
      }
      return out;
    },
  };
}
