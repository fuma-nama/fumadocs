'use client';

import { type ComponentPropsWithoutRef, lazy, type ReactNode } from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';
import type { DefaultSearchDialogProps } from '@/components/dialog/search-default';
import { ThemeProvider } from 'next-themes';
import { I18nProvider, type I18nProviderProps } from '@fumadocs/ui/contexts/i18n';
import { SearchProvider, type SearchProviderProps } from '@fumadocs/ui/contexts/search';

interface SearchOptions extends Omit<SearchProviderProps, 'options' | 'children'> {
  options?: Partial<DefaultSearchDialogProps>;

  /**
   * Enable search functionality
   *
   * @defaultValue `true`
   */
  enabled?: boolean;
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

const DefaultSearchDialog = lazy(() => import('@/components/dialog/search-default'));

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

  return <DirectionProvider dir={dir}>{body}</DirectionProvider>;
}
