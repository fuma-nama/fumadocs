'use client';

import { RootProvider } from 'next-docs-ui/provider';
import type { ReactNode } from 'react';
import SearchDialog from '@/components/search';

export function Provider({ children }: { children: ReactNode }): JSX.Element {
  return (
    <RootProvider
      search={{
        SearchDialog,
      }}
    >
      {children}
    </RootProvider>
  );
}
