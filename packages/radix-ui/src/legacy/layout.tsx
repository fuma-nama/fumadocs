'use client';
import { type ReactNode, useMemo, createContext, use } from 'react';
import { useIsScrollTop } from '@/utils/use-is-scroll-top';

export interface PageStyles {
  tocNav?: string;
  toc?: string;
  page?: string;
  article?: string;
}

/**
 * applied styles to different layout components in `Page` from layouts
 */
const StylesContext = createContext<PageStyles>({
  tocNav: 'xl:hidden',
  toc: 'max-xl:hidden',
});

export function usePageStyles() {
  return use(StylesContext);
}

export function StylesProvider({ children, ...value }: PageStyles & { children: ReactNode }) {
  return <StylesContext.Provider value={value}>{children}</StylesContext.Provider>;
}

export interface NavProviderProps {
  /**
   * Use transparent background
   *
   * @defaultValue none
   */
  transparentMode?: 'always' | 'top' | 'none';
}

interface NavContextType {
  isTransparent: boolean;
}

const NavContext = createContext<NavContextType>({
  isTransparent: false,
});

export function NavProvider({
  transparentMode = 'none',
  children,
}: NavProviderProps & { children: ReactNode }) {
  const isTop = useIsScrollTop({ enabled: transparentMode === 'top' });
  const transparent = transparentMode === 'top' ? (isTop ?? true) : transparentMode === 'always';

  return (
    <NavContext value={useMemo(() => ({ isTransparent: transparent }), [transparent])}>
      {children}
    </NavContext>
  );
}

export function useNav(): NavContextType {
  return use(NavContext);
}
