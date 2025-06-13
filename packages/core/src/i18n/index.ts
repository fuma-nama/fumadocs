export * from './middleware';

export interface I18nConfig {
  /**
   * Supported locale codes.
   *
   * A page tree will be built for each language.
   */
  languages: string[];

  /**
   * Default locale if not specified
   */
  defaultLanguage: string;

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
  parser?: 'dot' | 'dir';
}
