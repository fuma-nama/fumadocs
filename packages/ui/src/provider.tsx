'use client';

import { ThemeProvider } from 'next-themes';
import { type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { DirectionProvider } from '@radix-ui/react-direction';
import type { ThemeProviderProps } from 'next-themes/dist/types';
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
  theme?: Partial<ThemeProviderProps> & {
    /**
     * Enable `next-themes`
     *
     * @defaultValue true
     */
    enabled?: boolean;
  };

  children: ReactNode;
}

const DefaultSearchDialog = dynamic(
  () => import('@/components/dialog/search-default'),
  { ssr: false },
);

export function RootProvider({
  children,
  dir,
  theme: { enabled = true, ...theme } = {},
  search,
}: RootProviderProps): React.ReactElement {
  let body = children;

  if (search?.enabled !== false)
    body = (
      <SearchProvider SearchDialog={DefaultSearchDialog} {...search}>
        {body}
      </SearchProvider>
    );

  if (enabled)
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
    <DirectionProvider dir={dir ?? 'ltr'}>
      <SidebarProvider>{body}</SidebarProvider>
    </DirectionProvider>
  );
}

export { useI18n } from './contexts/i18n';
export { useSearchContext } from './contexts/search';
export { useSidebar } from './contexts/sidebar';
export { useTreeContext } from './contexts/tree';
