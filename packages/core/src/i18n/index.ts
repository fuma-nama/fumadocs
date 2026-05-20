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

export function defineI18n<const Languages extends string>(
  config: I18nConfig<Languages>,
): I18nConfig<Languages> {
  return config;
}

export type TranslationObject = Record<string, TranslationValue>;
export type TranslationValue<Params extends string = string> = string & { _params?: Params };

export interface TranslationsAPI<
  Languages extends string = string,
  Namespaces = Record<string, TranslationObject>,
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
  extend: <N extends string, Obj extends TranslationObject>(input: {
    namespace: N;
    defaultValue: Obj;
  }) => TranslationsAPI<Languages, Namespaces & { [K in N]: Obj }>;
  add: <N extends keyof Namespaces>(
    namespace: N,
    overrides: {
      [Lang in Languages]?: Partial<Namespaces[N]>;
    },
  ) => TranslationsAPI<Languages, Namespaces>;
}

export function defineTranslations<Languages extends string>(
  config: I18nConfig<Languages>,
): TranslationsAPI<Languages, {}> {
  const translations: Record<string, Record<string, TranslationObject>> = {};

  for (const lang of config.languages) {
    translations[lang] = {};
  }

  const api: TranslationsAPI = {
    config,
    $inferLanguages: undefined as never,
    $inferNamespaces: undefined as never,
    get(lang) {
      return translations[lang];
    },
    add(namespace, overrides) {
      for (const [lang, values] of Object.entries(overrides)) {
        Object.assign(translations[lang][namespace], values);
      }

      return this as never;
    },
    extend({ namespace, defaultValue }: { namespace: string; defaultValue: TranslationObject }) {
      for (const lang of config.languages) {
        translations[lang][namespace] = { ...defaultValue };
      }

      return this as never;
    },
  };

  return api as never;
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
      label = label.replaceAll(`$${k}`, params[k]);
    }
  }

  return label;
}
