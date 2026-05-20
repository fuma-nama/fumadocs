import type { I18nProviderProps } from '@/contexts/i18n';
import type {
  I18nConfig,
  TranslationsAPI,
  TranslationsAPIExtension,
  TranslationValue,
} from 'fumadocs-core/i18n';

export type Translations = {
  displayName: string;
  search: string;
  searchNoResult: string;
  searchOpen: string;
  searchClose: string;

  toc: string;
  tocNoHeadings: string;
  tocInline: string;

  lastUpdate: string;
  chooseLanguage: string;
  nextPage: string;
  previousPage: string;
  chooseTheme: string;
  editOnGithub: string;

  themeToggle: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;

  codeBlockCopy: string;
  codeBlockCopied: string;

  accordionCopyAnchor: string;
  headingCopyAnchor: string;
  bannerClose: string;
  menuToggle: string;

  pageActionsCopyMarkdown: string;
  pageActionsOpen: string;
  pageActionsOpenGitHub: string;
  pageActionsViewMarkdown: string;
  pageActionsOpenScira: string;
  pageActionsOpenChatGPT: string;
  pageActionsOpenClaude: string;
  pageActionsOpenCursor: string;
  pageActionsOpenInLLMPrompt: TranslationValue<'url'>;

  sidebarOpen: string;
  sidebarCollapse: string;

  typeTableProp: string;
  typeTableType: string;
  typeTableDefault: string;
  typeTableParameters: string;
  typeTableReturns: string;

  notFoundTitle: string;
  notFoundDescription: string;
  notFoundLink: string;
};

export const defaultTranslations: Translations = {
  displayName: 'English',
  search: 'Search',
  searchNoResult: 'No results found',
  toc: 'On this page',
  tocNoHeadings: 'No Headings',
  lastUpdate: 'Last updated on',
  chooseLanguage: 'Choose a language',
  nextPage: 'Next Page',
  previousPage: 'Previous Page',
  chooseTheme: 'Theme',
  editOnGithub: 'Edit on GitHub',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  codeBlockCopy: 'Copy Text',
  codeBlockCopied: 'Copied Text',
  accordionCopyAnchor: 'Copy Link',
  headingCopyAnchor: 'Copy Anchor Link',
  pageActionsCopyMarkdown: 'Copy Markdown',
  pageActionsOpen: 'Open',
  pageActionsOpenGitHub: 'Open in GitHub',
  pageActionsViewMarkdown: 'View as Markdown',
  pageActionsOpenScira: 'Open in Scira AI',
  pageActionsOpenChatGPT: 'Open in ChatGPT',
  pageActionsOpenClaude: 'Open in Claude',
  pageActionsOpenCursor: 'Open in Cursor',
  pageActionsOpenInLLMPrompt: 'Read {url}, I want to ask questions about it.',
  bannerClose: 'Close Banner',
  searchOpen: 'Open Search',
  searchClose: 'Close Search',
  menuToggle: 'Toggle Menu',
  themeToggle: 'Toggle Theme',
  sidebarOpen: 'Open Sidebar',
  sidebarCollapse: 'Collapse Sidebar',
  tocInline: 'Table of Contents',
  typeTableProp: 'Prop',
  typeTableType: 'Type',
  typeTableDefault: 'Default',
  typeTableParameters: 'Parameters',
  typeTableReturns: 'Returns',
  notFoundTitle: 'Page Not Found',
  notFoundDescription:
    'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
  notFoundLink: 'Back to Home',
};

type TranslationsConfig<Languages extends string> = {
  [K in Languages]?: Partial<Translations>;
};

export function uiTranslations(): TranslationsAPIExtension<'ui', Translations> {
  return {
    namespace: 'ui',
    defaultValue: defaultTranslations,
  };
}

export function i18nProvider<
  Languages extends string,
  P extends {
    ui: Translations;
  },
>(
  translations: TranslationsAPI<Languages, P>,
  lang?: NoInfer<Languages> | (string & {}),
): I18nProviderProps {
  const { defaultLanguage, languages } = translations.config;
  const { ui, ...rest } =
    translations.get(lang ?? defaultLanguage) ?? translations.get(defaultLanguage);

  return {
    locale: lang,
    translations: { ...ui, ...rest },
    locales: languages.map((locale) => ({
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

/** @deprecated use the `i18n.translations()` & `uiTranslations()` APIs instead */
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
