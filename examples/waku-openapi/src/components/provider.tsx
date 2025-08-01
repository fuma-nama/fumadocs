'use client';
import type { ReactNode } from 'react';
import { WakuProvider } from 'fumadocs-core/framework/waku';
import { RootProvider } from 'fumadocs-ui/provider/base';

export function Provider({ children }: { children: ReactNode }) {
  return (
    <WakuProvider>
      <RootProvider>{children}</RootProvider>
    </WakuProvider>
  );
}
