'use client';

import { useAISearchContext } from '@/components/inkeep/search';
import { PointerLayout, PointerLayoutProps } from 'fumadocs-ui/layouts/pointer';

export function ClientPointerLayout(props: PointerLayoutProps) {
  const { open, setOpen } = useAISearchContext();

  return (
    <PointerLayout
      {...props}
      aiChat={{
        open,
        onOpenChange: setOpen,
      }}
    />
  );
}
