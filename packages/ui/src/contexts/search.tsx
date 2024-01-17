import type { ComponentType, ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { SharedProps } from '../components/dialog/search';

export interface SearchProviderProps {
  /**
   * Preload search dialog before opening it
   *
   * @defaultValue `true`
   */
  preload?: boolean;

  /**
   * Custom links to be displayed if search is empty
   */
  links?: SearchContextType['links'];

  /**
   * Replace default search dialog, allowing you to use other solutions such as Algolia Search
   *
   * It receives the `open` and `onOpenChange` prop, shall be lazy loaded with `next/dynamic`
   */
  SearchDialog: ComponentType<SharedProps>;

  children: ReactNode;
}

interface SearchContextType {
  links: [name: string, link: string][];
  setOpenSearch: (value: boolean) => void;
}

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
  links = [],
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

  return (
    <SearchContext.Provider value={{ links, setOpenSearch: setIsOpen }}>
      {isOpen !== undefined && (
        <SearchDialog open={isOpen} onOpenChange={setIsOpen} />
      )}
      {children}
    </SearchContext.Provider>
  );
}
