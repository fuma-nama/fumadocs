'use client';

console.warn(
  '`fumadocs-ui/provider` export will be removed on v17, you can import from `fumadocs-ui/provider/next` instead.',
);

export {
  /**
   * @deprecated Import from `fumadocs-ui/provider/next` instead.
   */
  RootProvider,
} from './next';

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
