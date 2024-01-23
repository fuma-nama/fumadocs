'use client';

import { SidebarProvider } from 'fumadocs-core/sidebar';
import { ThemeProvider } from 'next-themes';
import { type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { SidebarCollapseProvider } from '@/contexts/sidebar';
import { SearchProvider, type SearchProviderProps } from './contexts/search';

export interface RootProviderProps {
  search?: Partial<Omit<SearchProviderProps, 'children'>>;

  /**
   * Wrap the body in `ThemeProvider` (next-themes)
   *
   * @defaultValue true
   */
  enableThemeProvider?: boolean;
  children: ReactNode;
}

const DefaultSearchDialog = dynamic(
  () => import('@/components/dialog/search-default'),
  { ssr: false },
);

export function RootProvider({
  children,
  enableThemeProvider = true,
  search,
}: RootProviderProps): JSX.Element {
  const body = (
    <SidebarProvider>
      <SidebarCollapseProvider>
        <SearchProvider SearchDialog={DefaultSearchDialog} {...search}>
          {children}
        </SearchProvider>
      </SidebarCollapseProvider>
    </SidebarProvider>
  );

  return enableThemeProvider ? (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {body}
    </ThemeProvider>
  ) : (
    body
  );
}

export { useI18n } from './contexts/i18n';
export { useSearchContext } from './contexts/search';
export { useSidebarCollapse } from './contexts/sidebar';
export { useTreeContext } from './contexts/tree';
