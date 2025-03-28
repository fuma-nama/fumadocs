'use client';

import { RootProvider as BaseProvider } from './base';
import type { ComponentProps } from 'react';
import { NextProvider } from 'fumadocs-core/framework/next';

export function RootProvider(props: ComponentProps<typeof BaseProvider>) {
  return (
    <NextProvider>
      <BaseProvider {...props}>{props.children}</BaseProvider>
    </NextProvider>
  );
}

export { useI18n, I18nLabel } from '@/contexts/i18n';
export {
  SearchProvider,
  SearchOnly,
  useSearchContext,
  type SearchProviderProps,
} from '@/contexts/search';
export { SidebarProvider, useSidebar } from '@/contexts/sidebar';
export {
  useTreePath,
  useTreeContext,
  TreeContextProvider,
} from '@/contexts/tree';
export {
  useNav,
  NavProvider,
  type NavProviderProps,
  type PageStyles,
  StylesProvider,
  usePageStyles,
} from '@/contexts/layout';
