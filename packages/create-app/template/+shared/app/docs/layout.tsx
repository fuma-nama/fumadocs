import { pageTree } from '../source';
import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';
import { baseOptions } from '../layout.config';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={pageTree} {...baseOptions}>
      {children}
    </DocsLayout>
  );
}
