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

export interface TranslationExtension<Keys extends string = string> {
  keys: readonly Keys[];
}

export interface TranslationPreset<Keys extends string = string> {
  name: string;
  value: Partial<Record<Keys, string>>;
}

export interface TranslationsAPI<Languages extends string = string, Keys extends string = string> {
  /** for type inference only, always `undefined` in runtime */
  $inferLanguages: Languages;
  /** for type inference only, always `undefined` in runtime */
  $inferKeys: Keys;

  config: I18nConfig<Languages>;

  get: {
    (lang: Languages): Partial<Record<Keys, string>>;
    (lang: string): Partial<Record<Keys, string>> | undefined;
  };
  /** register allowed translation keys */
  extend<const NewKeys extends string>(
    extension: TranslationExtension<NewKeys>,
  ): TranslationsAPI<Languages, Keys | NewKeys>;
  /** add translations */
  add(overrides: {
    [Lang in Languages]?: Partial<Record<Keys, string>>;
  }): TranslationsAPI<Languages, Keys>;
  /** @deprecated the namespace parameter is now unnecessary  */
  add(
    unused: string,
    overrides: {
      [Lang in Languages]?: Partial<Record<Keys, string>> & {
        /** @deprecated the label is no longer used */
        [key: string]: string;
      };
    },
  ): TranslationsAPI<Languages, Keys>;
  /** add language pack */
  preset: (lang: Languages, preset: TranslationPreset<Keys>) => TranslationsAPI<Languages, Keys>;
}

export interface I18nAPI<Languages extends string = string> extends I18nConfig<Languages> {
  translations: () => TranslationsAPI<Languages, never>;
}

export interface SingularTranslationsAPI<Keys extends string = string> {
  /** for type inference only, always `undefined` in runtime */
  $inferKeys: Keys;

  get: () => Partial<Record<Keys, string>>;
  /** register allowed translation keys */
  extend<const NewKeys extends string>(
    extension: TranslationExtension<NewKeys>,
  ): SingularTranslationsAPI<Keys | NewKeys>;
  /** add translations */
  add(overrides: Partial<Record<Keys, string>>): SingularTranslationsAPI<Keys>;
  /** @deprecated the namespace parameter is now unnecessary  */
  add(
    unused: string,
    overrides: Partial<Record<Keys, string>> & {
      /** @deprecated the label is no longer used */
      [key: string]: string;
    },
  ): SingularTranslationsAPI<Keys>;
  /** add language pack */
  preset: (preset: TranslationPreset<Keys>) => SingularTranslationsAPI<Keys>;
}

function pickTranslations(full: Record<string, string>, keys: Set<string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const k in full) {
    if (keys.has(k)) result[k] = full[k];
  }
  return result;
}

export function defineI18n<const Languages extends string>(
  config: I18nConfig<Languages>,
): I18nAPI<Languages> {
  return {
    ...config,
    translations() {
      const translations: Record<string, Record<string, string>> = {};
      const registeredKeys = new Set<string>();

      for (const lang of config.languages) {
        translations[lang] = {};
      }

      return {
        config,
        $inferLanguages: undefined as never,
        $inferKeys: undefined as never,
        get(lang) {
          if (!translations[lang]) return undefined as never;
          return pickTranslations(translations[lang], registeredKeys);
        },
        extend(extension) {
          for (const key of extension.keys) registeredKeys.add(key);
          return this as never;
        },
        add(
          ...args:
            | [string, Record<string, Record<string, string>>]
            | [Record<string, Record<string, string>>]
        ) {
          const overrides = args.length === 2 ? args[1] : args[0];

          for (const [lang, values] of Object.entries(overrides)) {
            Object.assign((translations[lang] ??= {}), values);
          }

          return this as never;
        },
        preset(lang, preset) {
          Object.assign(translations[lang], preset.value);
          return this as never;
        },
      } as TranslationsAPI<string> as never;
    },
  };
}

/** create translations API without i18n */
export function defineTranslations(): SingularTranslationsAPI<never> {
  const translations: Record<string, string> = {};
  const registeredKeys = new Set<string>();

  return {
    $inferKeys: undefined as never,
    get() {
      return pickTranslations(translations, registeredKeys);
    },
    extend(extension) {
      for (const key of extension.keys) registeredKeys.add(key);
      return this as never;
    },
    add(...args: [string, Record<string, string>] | [Record<string, string>]) {
      Object.assign(translations, args.length === 2 ? args[1] : args[0]);
      return this as never;
    },
    preset(preset) {
      Object.assign(translations, preset.value);
      return this as never;
    },
  } as SingularTranslationsAPI<never>;
}
