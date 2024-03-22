'use client';

import { SidebarProvider } from 'fumadocs-core/sidebar';
import { ThemeProvider } from 'next-themes';
import { type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { DirectionProvider } from '@radix-ui/react-direction';
import { SidebarCollapseProvider } from '@/contexts/sidebar';
import { DefaultSearchDialogProps } from '@/components/dialog/search-default';
import { SearchProvider, type SearchProviderProps } from './contexts/search';

export interface RootProviderProps {
  /**
   * `dir` option for Radix UI
   */
  dir?: 'rtl' | 'ltr';

  /**
   * @remarks `SearchProviderProps`
   */
  search?: Partial<
    Omit<SearchProviderProps, 'options' | 'children'> & {
      options?: Partial<DefaultSearchDialogProps> | object;
    }
  >;

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
  dir,
  enableThemeProvider = true,
  search,
}: RootProviderProps): React.ReactElement {
  let body = (
    <SidebarProvider>
      <SidebarCollapseProvider>
        <SearchProvider SearchDialog={DefaultSearchDialog} {...search}>
          {children}
        </SearchProvider>
      </SidebarCollapseProvider>
    </SidebarProvider>
  );

  if (enableThemeProvider)
    body = (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {body}
      </ThemeProvider>
    );

  if (dir) body = <DirectionProvider dir={dir}>{body}</DirectionProvider>;

  return body;
}

export { useI18n } from './contexts/i18n';
export { useSearchContext } from './contexts/search';
export { useSidebarCollapse } from './contexts/sidebar';
export { useTreeContext } from './contexts/tree';
