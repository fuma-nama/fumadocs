import { pageTree } from '../source';
import { DocsLayout } from '@fuma-docs/ui/layout';
import type { ReactNode } from 'react';

export default function RootDocsLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={pageTree} nav={{ title: 'My App' }}>
      {children}
    </DocsLayout>
  );
}
