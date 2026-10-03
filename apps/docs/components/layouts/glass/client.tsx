'use client';

import { AISearchPanel, useAISearchContext, useHotKey } from '@/components/inkeep/search';
import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/glass';

export function ClientGlassLayout(props: DocsLayoutProps) {
  const { open, setOpen } = useAISearchContext();
  useHotKey();

  return (
    <DocsLayout {...props} aiChat={{ open, onOpenChange: setOpen, panel: <AISearchPanel /> }} />
  );
}
