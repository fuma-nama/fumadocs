'use client';

import { useAISearchContext } from '@/components/inkeep/search';
import { SpaciousLayout, type SpaciousLayoutProps } from 'fumadocs-ui/layouts/spacious';

export function ClientSpaciousLayout(props: SpaciousLayoutProps) {
  const { open, setOpen } = useAISearchContext();

  return <SpaciousLayout {...props} aiChat={{ open, onOpenChange: setOpen }} />;
}
