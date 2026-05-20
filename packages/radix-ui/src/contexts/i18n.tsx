'use client';
import { createContext, type ReactNode, use, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'fumadocs-core/framework';
import {
  renderTranslation,
  type TranslationObject,
  type TranslationValue,
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

interface LocaleItem {
  name: string;
  locale: string;
}

interface I18nContextType {
  text: Translations & Record<string, string | Record<string, string>>;
  locale?: string;
  onChange?: (v: string) => void;
  locales?: LocaleItem[];
}

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

const I18nContext = createContext<I18nContextType>({
  text: defaultTranslations,
});

export function I18nLabel<
  Obj extends TranslationObject = Translations,
  K extends keyof Obj = keyof Obj,
>({
  label,
  namespace,
  params,
}: {
  label: K;
  namespace?: string;
  params?: Obj[K]['_params'] extends string ? Record<Obj[K]['_params'], string> : never;
}): string {
  const t = useTranslations<Obj>(namespace);
  return renderTranslation(t[label], params!);
}

export function useI18n(): I18nContextType {
  return use(I18nContext);
}

export function useTranslations<Obj extends TranslationObject>(namespace?: string): Obj {
  return (namespace ? use(I18nContext).text[namespace] : use(I18nContext).text) as Obj;
}

export interface I18nProviderProps {
  /**
   * Current locale
   */
  locale?: string;

  /**
   * Handle changes to the locale, redirect user when not specified.
   */
  onLocaleChange?: (v: string) => void;

  /**
   * Translations of current locale
   */
  translations?: Partial<I18nContextType['text']>;

  /**
   * Available languages
   */
  locales?: LocaleItem[];

  children?: ReactNode;
}

export function I18nProvider({
  locales = [],
  locale,
  onLocaleChange,
  children,
  translations,
}: I18nProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const onChange = (value: string) => {
    if (onLocaleChange) {
      return onLocaleChange(value);
    }
    const segments = pathname.split('/').filter((v) => v.length > 0);

    // If locale prefix hidden
    if (segments.length === 0 || segments[0] !== locale) {
      segments.unshift(value);
    } else {
      segments[0] = value;
    }

    router.push(`/${segments.join('/')}`);
  };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  return (
    <I18nContext
      value={useMemo(
        () => ({
          locale,
          locales,
          text: {
            ...defaultTranslations,
            ...translations,
          },
          onChange: (v) => onChangeRef.current(v),
        }),
        [locale, locales, translations],
      )}
    >
      {children}
    </I18nContext>
  );
}
