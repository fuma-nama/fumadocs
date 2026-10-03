'use client';

import { AISearchPanel, useAISearchContext, useHotKey } from '@/components/inkeep/search';
import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/docs';

export function ClientDocsLayout(props: DocsLayoutProps) {
  const { open, setOpen } = useAISearchContext();
  useHotKey();

  return (
    <DocsLayout {...props} aiChat={{ open, onOpenChange: setOpen, panel: <AISearchPanel /> }} />
  );
}
