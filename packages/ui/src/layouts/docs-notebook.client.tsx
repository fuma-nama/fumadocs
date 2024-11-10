'use client';
import { cn } from '@/utils/cn';
import type { HTMLAttributes } from 'react';
import { useSidebar } from '@/contexts/sidebar';

export function LayoutBody(props: HTMLAttributes<HTMLElement>) {
  const { collapsed } = useSidebar();

  return (
    <main
      id="nd-docs-layout"
      {...props}
      className={cn('flex w-full flex-1 flex-row', props.className)}
      style={
        {
          ...props.style,
          '--fd-content-width': collapsed
            ? '100vw'
            : 'calc(min(100vw, var(--fd-layout-width)) - var(--fd-sidebar-width))',
        } as object
      }
    >
      {props.children}
    </main>
  );
}
