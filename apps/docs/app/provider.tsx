'use client';

import { RootProvider } from 'fumadocs-ui/provider/base';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { Tooltip } from '@base-ui/react/tooltip';

const SearchDialog = dynamic(() => import('@/components/layouts/search'), {
  ssr: false,
});

const inject = `
const urlParams = new URLSearchParams(window.location.search);
const uwuParam = urlParams.get("uwu");

if (typeof uwuParam === 'string') {
    localStorage.setItem('uwu', uwuParam);
}

const item = localStorage.getItem('uwu')

if (item === 'true') {
    document.documentElement.classList.add("uwu")
}
`;

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{
        SearchDialog,
      }}
    >
      <Tooltip.Provider>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: inject }} />
        {children}
      </Tooltip.Provider>
    </RootProvider>
  );
}
