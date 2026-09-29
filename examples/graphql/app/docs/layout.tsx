import { source } from '@/lib/source';
import { GlassLayout } from 'fumadocs-ui/layouts/glass';
import type { ReactNode } from 'react';
import { baseOptions } from '@/lib/layout.shared';

export default function RootDocsLayout({ children }: { children: ReactNode }) {
  return (
    <GlassLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </GlassLayout>
  );
}
