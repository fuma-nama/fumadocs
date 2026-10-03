'use client';
import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import { AISearchPanel, useAISearchContext, useHotKey } from './search';

export function AIDocsLayout(props: DocsLayoutProps) {
  const { open, setOpen } = useAISearchContext();
  useHotKey();

  return (
    <DocsLayout {...props} aiChat={{ open, onOpenChange: setOpen, panel: <AISearchPanel /> }} />
  );
}
