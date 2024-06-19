import { getPageTree, minimumRevalidate } from '../source';
import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';

export const revalidate = minimumRevalidate;

export default async function RootDocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DocsLayout tree={await getPageTree()} nav={{ title: 'My App' }}>
      {children}
    </DocsLayout>
  );
}
