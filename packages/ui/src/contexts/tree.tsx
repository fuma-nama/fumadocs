import type { PageTree } from 'next-docs-zeta/server';
import { createContext, useContext, type ReactNode } from 'react';

export interface LinkItem {
  url: string;
  icon?: ReactNode;
  text: string;
  external?: boolean;
}

export const TreeContext = createContext<PageTree>({
  name: 'Docs',
  children: [],
});

export function TreeContextProvider({
  children,
  value,
}: {
  value?: PageTree;
  children: ReactNode;
}): JSX.Element {
  const current = useContext(TreeContext);

  return (
    <TreeContext.Provider value={value ?? current}>
      {children}
    </TreeContext.Provider>
  );
}
