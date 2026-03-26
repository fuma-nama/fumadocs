'use client';
import type { ReactNode } from 'react';
import { ClientCodeBlockProvider } from '../components/codeblock';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';

export function FullProvider({ children }: { children: ReactNode }) {
  return (
    <ClientCodeBlockProvider factory={defaultShikiFactory}>{children}</ClientCodeBlockProvider>
  );
}
