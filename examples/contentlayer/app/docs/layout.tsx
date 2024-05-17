import { pageTree } from '../source';
import { DocsLayout } from '@maximai/fumadocs-ui/layout';
import type { ReactNode } from 'react';

export default function RootDocsLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={pageTree} nav={{ title: 'My App' }}>
      {children}
    </DocsLayout>
  );
}
