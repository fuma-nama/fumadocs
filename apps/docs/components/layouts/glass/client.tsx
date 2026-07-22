'use client';

import { useAISearchContext } from '@/components/inkeep/search';
import { GlassLayout, GlassLayoutProps } from 'fumadocs-ui/layouts/glass';

export function ClientGlassLayout(props: GlassLayoutProps) {
  const { open, setOpen } = useAISearchContext();

  return (
    <GlassLayout
      {...props}
      aiChat={{
        open,
        onOpenChange: setOpen,
      }}
    />
  );
}
