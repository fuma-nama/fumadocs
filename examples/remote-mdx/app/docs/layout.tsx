import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import pageTree from '@/content/docs/page-tree';

export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={pageTree} nav={{ title: 'Example Docs' }}>
      {children}
    </DocsLayout>
  );
}
