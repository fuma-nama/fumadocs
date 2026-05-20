export interface I18nConfig<Languages extends string = string> {
  /**
   * Supported locale codes.
   *
   * A page tree will be built for each language.
   */
  languages: Languages[];

  /**
   * Default locale if not specified
   */
  defaultLanguage: NoInfer<Languages>;

  /**
   * Don't show the locale prefix on URL.
   *
   * - `always`: Always hide the prefix
   * - `default-locale`: Only hide the default locale
   * - `never`: Never hide the prefix
   *
   * This API uses `NextResponse.rewrite`.
   *
   * @defaultValue 'never'
   */
  hideLocale?: 'always' | 'default-locale' | 'never';

  /**
   * Used by `loader()`, specify the way to parse i18n file structure.
   *
   * @defaultValue 'dot'
   */
  parser?: 'dot' | 'dir' | 'none';

  /**
   * the fallback language when the page has no translations available for a given locale.
   *
   * Default to `defaultLanguage`, no fallback when set to `null`.
   */
  fallbackLanguage?: NoInfer<Languages> | null;
}

export interface I18nAPI<Languages extends string = string> extends I18nConfig<Languages> {
  translations: () => TranslationsAPI<Languages, {}>;
}

export function defineI18n<const Languages extends string>(
  config: I18nConfig<Languages>,
): I18nAPI<Languages> {
  return {
    ...config,
    translations() {
      // lang -> (namespace, object)
      const translations: Record<string, Record<string, TranslationObject>> = {};

      for (const lang of config.languages) {
        translations[lang] = {};
      }

      return {
        config,
        $inferLanguages: undefined as never,
        $inferNamespaces: undefined as never,
        get(lang) {
          return translations[lang];
        },
        add(
          ...args:
            | [
                string,
                {
                  [Lang in Languages]?: TranslationObject;
                },
              ]
            | [TranslationPreset]
        ) {
          if (args.length === 1) {
            const [preset] = args;
            const t = translations[preset.language];
            for (const [namespace, obj] of Object.entries(preset.value)) {
              Object.assign(t[namespace], obj);
            }

            return this as never;
          }

          const [namespace, overrides] = args;
          for (const [lang, values] of Object.entries(overrides)) {
            Object.assign(translations[lang][namespace], values);
          }

          return this as never;
        },
        extend({ namespace, defaultValue }) {
          for (const lang of config.languages) {
            translations[lang][namespace] = { ...defaultValue };
          }

          return this as never;
        },
      };
    },
  };
}

export type TranslationObject = Record<string, TranslationValue>;
export type TranslationValue<Params extends string = string> = string & { _params?: Params };
export type TranslationPreset<
  Language extends string = string,
  Namespaces extends Record<string, TranslationObject> = Record<string, TranslationObject>,
> = {
  language: Language;
  value: Partial<Namespaces>;
};

export interface TranslationsAPIExtension<
  Namespace extends string = string,
  Obj extends TranslationObject = TranslationObject,
> {
  namespace: Namespace;
  defaultValue: Obj;
}

export interface TranslationsAPI<
  Languages extends string = string,
  Namespaces extends Record<string, TranslationObject> = Record<string, TranslationObject>,
> {
  /** for type inference only, always `undefined` in runtime */
  $inferLanguages: Languages;
  /** for type inference only, always `undefined` in runtime */
  $inferNamespaces: Namespaces;

  config: I18nConfig<Languages>;

  get: {
    (lang: Languages): Namespaces;
    (lang: string): Namespaces | undefined;
  };
  extend: <N extends string, Obj extends TranslationObject>(
    extension: TranslationsAPIExtension<N, Obj>,
  ) => TranslationsAPI<Languages, Namespaces & { [K in N]: Obj }>;
  add: {
    <N extends keyof Namespaces>(
      namespace: N,
      overrides: {
        [Lang in Languages]?: Partial<Namespaces[N]>;
      },
    ): TranslationsAPI<Languages, Namespaces>;
    (preset: TranslationPreset<Languages, Namespaces>): TranslationsAPI<Languages, Namespaces>;
  };
}

export function renderTranslation(v: TranslationValue<never>): string;
export function renderTranslation<Params extends string>(
  v: TranslationValue<Params>,
  params: Record<Params, string>,
): string;

export function renderTranslation(
  label: TranslationValue,
  params?: Record<string, string>,
): string {
  if (params) {
    for (const k in params) {
      label = label.replaceAll(`{${k}}`, params[k]);
    }
  }

  return label;
}
