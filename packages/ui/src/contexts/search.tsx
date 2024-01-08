import dynamic from 'next/dynamic';
import type { ComponentType, ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { DefaultSearchDialogProps } from '../components/dialog/search-default';
import type { SharedProps } from '../components/dialog/search';

const DefaultSearchDialog = dynamic(
  () => import('../components/dialog/search-default'),
  { ssr: false },
);

export interface SearchProviderProps {
  /**
   * Preload search dialog before opening it
   *
   * @defaultValue `true`
   */
  preload?: boolean;

  links?: DefaultSearchDialogProps['links'];

  /**
   * Replace default search dialog, allowing you to use other solutions such as Algolia Search
   *
   * It receives the `open` and `onOpenChange` prop, shall be lazy loaded with `next/dynamic`
   */
  SearchDialog?: ComponentType<SharedProps>;

  children: ReactNode;
}

type SearchContextType = [setOpenSearch: (value: boolean) => void];
const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function useSearchContext(): SearchContextType {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('Missing root provider');
  return ctx;
}

export function SearchProvider({
  SearchDialog,
  children,
  preload = true,
  ...props
}: SearchProviderProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(preload ? false : undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        setIsOpen(true);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, []);

  const Dialog = SearchDialog ?? DefaultSearchDialog;

  return (
    <SearchContext.Provider value={[setIsOpen]}>
      {isOpen !== undefined && (
        <Dialog open={isOpen} onOpenChange={setIsOpen} {...props} />
      )}
      {children}
    </SearchContext.Provider>
  );
}
