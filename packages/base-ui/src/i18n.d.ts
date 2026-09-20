import type { I18nProviderProps } from '@/contexts/i18n';
import type {
  I18nConfig,
  SingularTranslationsAPI,
  TranslationExtension,
  TranslationsAPI,
} from 'fumadocs-core/i18n';
import type { Translations } from '@/.translations';
export type { Translations };
export declare function uiTranslations(): TranslationExtension<keyof Translations>;
export declare function i18nProvider(translations: SingularTranslationsAPI): I18nProviderProps;
export declare function i18nProvider<Languages extends string>(
  translations: TranslationsAPI<Languages>,
  lang?: NoInfer<Languages> | (string & {}),
): I18nProviderProps;
export interface I18nUIConfig<Languages extends string> extends I18nConfig<Languages> {
  provider: (locale?: Languages | (string & {})) => I18nProviderProps;
}
export declare function defineI18nUI<Languages extends string>(
  config: I18nConfig<Languages>,
  localeTranslations?: Partial<
    Record<
      Languages,
      Record<string, string> & {
        displayName?: string;
      }
    >
  >,
): I18nUIConfig<Languages>;
//# sourceMappingURL=i18n.d.ts.map
