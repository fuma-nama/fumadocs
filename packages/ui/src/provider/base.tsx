'use client';

import { ThemeProvider } from 'next-themes';
import {
  type ComponentPropsWithoutRef,
  lazy,
  type ReactNode,
  useMemo,
} from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';
import type { DefaultSearchDialogProps } from '@/components/dialog/search-default';
import { SidebarProvider } from '@/contexts/sidebar';
import { SearchProvider, type SearchProviderProps } from '@/contexts/search';
import type { HighlightMatches } from '@/components/dialog/search-highlight';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import {
  defaultTranslations,
  I18nContext,
  type LocaleItem,
  type Translations,
} from '@/contexts/i18n';
import { usePathname, useRouter } from 'fumadocs-core/framework';

interface SearchOptions
  extends Omit<SearchProviderProps, 'options' | 'children'> {
  options?: Partial<DefaultSearchDialogProps>;

  /**
   * Enable search functionality
   *
   * @defaultValue `true`
   */
  enabled?: boolean;

  /**
   * Highlight matched query terms inside result text.
   * Configure it globally at the provider level.
   * - `true` enables auto token-based highlighting from the query
   * - pass `{ regex, color }` to customize matching and color
   *
   * @example
   * highlightMatches: true
   * @example
   * highlightMatches: { color: 'text-emerald-500' }
   * @example
   * highlightMatches: { regex: '/\\b(api|auth)\\b/i', color: '#10b981' }
   */
  highlightMatches?: HighlightMatches;
}

export interface RootProviderProps {
  /**
   * `dir` option for Radix UI
   */
  dir?: 'rtl' | 'ltr';

  /**
   * @remarks `SearchProviderProps`
   */
  search?: Partial<SearchOptions>;

  /**
   * Customise options of `next-themes`
   */
  theme?: Partial<ComponentPropsWithoutRef<typeof ThemeProvider>> & {
    /**
     * Enable `next-themes`
     *
     * @defaultValue true
     */
    enabled?: boolean;
  };

  i18n?: Omit<I18nProviderProps, 'children'>;

  children?: ReactNode;
}

export interface I18nProviderProps {
  /**
   * Current locale
   */
  locale: string;

  /**
   * Handle changes to the locale, redirect user when not specified.
   */
  onLocaleChange?: (v: string) => void;

  /**
   * Translations of current locale
   */
  translations?: Partial<Translations>;

  /**
   * Available languages
   */
  locales?: LocaleItem[];

  children?: ReactNode;
}

const DefaultSearchDialog = lazy(
  () => import('@/components/dialog/search-default'),
);

export function RootProvider({
  children,
  dir = 'ltr',
  theme = {},
  search,
  i18n,
}: RootProviderProps) {
  let body = children;

  if (search?.enabled !== false)
    body = (
      <SearchProvider SearchDialog={DefaultSearchDialog} {...search}>
        {body}
      </SearchProvider>
    );

  if (theme?.enabled !== false)
    body = (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        {...theme}
      >
        {body}
      </ThemeProvider>
    );

  if (i18n) {
    body = <I18nProvider {...i18n}>{body}</I18nProvider>;
  }

  return (
    <DirectionProvider dir={dir}>
      <SidebarProvider>{body}</SidebarProvider>
    </DirectionProvider>
  );
}

function I18nProvider({
  locales = [],
  locale,
  onLocaleChange,
  ...props
}: I18nProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const onChange = useEffectEvent((value: string) => {
    if (onLocaleChange) {
      return onLocaleChange(value);
    }
    const segments = pathname.split('/').filter((v) => v.length > 0);

    // If locale prefix hidden
    if (segments[0] !== locale) {
      segments.unshift(value);
    } else {
      segments[0] = value;
    }

    router.push(`/${segments.join('/')}`);
    router.refresh();
  });

  return (
    <I18nContext.Provider
      value={useMemo(
        () => ({
          locale,
          locales,
          text: {
            ...defaultTranslations,
            ...props.translations,
          },
          onChange,
        }),
        [locale, locales, onChange, props.translations],
      )}
    >
      {props.children}
    </I18nContext.Provider>
  );
}
