'use client';
// publicly exposed React contexts

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
export * from '@/contexts/layout';
