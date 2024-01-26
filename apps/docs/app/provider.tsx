'use client';

import { RootProvider } from 'fumadocs-ui/provider';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const SearchDialog = dynamic(() => import('@/components/search'), {
  ssr: false,
});

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
