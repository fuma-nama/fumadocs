import { getPageTree } from '../source';
import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { Listener } from '@/app/docs/listener';

export default async function RootDocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DocsLayout tree={await getPageTree()} nav={{ title: 'My App' }}>
      <Listener />
      {children}
    </DocsLayout>
  );
}
