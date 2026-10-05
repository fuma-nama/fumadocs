'use client';

import { AIChatPanel, useAIChat } from '@/components/inkeep/search';
import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/spacious';

export function ClientSpaciousLayout(props: DocsLayoutProps) {
  const { open, setOpen } = useAIChat();

  return <DocsLayout {...props} aiChat={{ open, onOpenChange: setOpen, panel: <AIChatPanel /> }} />;
}
