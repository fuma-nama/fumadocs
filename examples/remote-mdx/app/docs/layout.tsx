import { pageTree } from '../source';
import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { Listener } from '@/app/docs/listener';

export default async function RootDocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DocsLayout tree={pageTree} nav={{ title: 'My App' }}>
      <Listener />
      {children}
    </DocsLayout>
  );
}
