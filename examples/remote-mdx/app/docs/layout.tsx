import { getDocs } from '../source';
import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { initHotReload } from '@fumadocs/mdx-remote/github/next';

const { component } = initHotReload();

export default async function RootDocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DocsLayout tree={(await getDocs()).pageTree} nav={{ title: 'My App' }}>
      {component}
      {children}
    </DocsLayout>
  );
}
