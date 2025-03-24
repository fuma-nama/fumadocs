'use client';

import { ThemeProvider } from 'next-themes';
import { type ComponentPropsWithoutRef, lazy, type ReactNode } from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';
import type { DefaultSearchDialogProps } from '@/components/dialog/search-default';
import { SidebarProvider } from './contexts/sidebar';
import { SearchProvider, type SearchProviderProps } from './contexts/search';

interface SearchOptions
  extends Omit<SearchProviderProps, 'options' | 'children'> {
  options?: Partial<DefaultSearchDialogProps> | SearchProviderProps['options'];
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

  return (
    <DirectionProvider dir={dir}>
      <SidebarProvider>{body}</SidebarProvider>
    </DirectionProvider>
  );
}

export { useI18n, I18nLabel } from './contexts/i18n';
export {
  SearchProvider,
  SearchOnly,
  useSearchContext,
  type SearchProviderProps,
} from './contexts/search';
export { SidebarProvider, useSidebar } from './contexts/sidebar';
export {
  useTreePath,
  useTreeContext,
  TreeContextProvider,
} from './contexts/tree';
export {
  StylesProvider,
  usePageStyles,
  type PageStyles,
} from './contexts/layout';
