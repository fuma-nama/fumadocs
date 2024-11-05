'use client';
import { type ReactNode, useContext, useMemo } from 'react';
import { useSidebar } from '@/contexts/sidebar';
import { NavContext } from '@/components/layout/nav';
import { cn } from '@/utils/cn';
import type { TOCItemType } from 'fumadocs-core/server';
import { useI18n } from '@/contexts/i18n';
import * as Primitive from 'fumadocs-core/toc';
import { ChevronRight, Text } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { PopoverContentProps } from '@radix-ui/react-popover';

export function TocPopover(props: { className?: string; children: ReactNode }) {
  const { open } = useSidebar();
  const { isTransparent } = useContext(NavContext);

  return (
    <div
      id="nd-tocnav"
      className={cn(
        'sticky top-fd-layout-top z-10 border-b border-fd-foreground/10 text-sm transition-colors md:top-[var(--fd-toc-top-with-offset)] md:mx-3 md:rounded-full md:border',
        !isTransparent && 'bg-fd-background/80 backdrop-blur-md md:shadow-md',
        open && 'opacity-0',
        props.className,
      )}
      style={
        {
          '--fd-toc-top-with-offset':
            'calc(4px + var(--fd-banner-height) + var(--fd-nav-height))',
        } as object
      }
    >
      <Popover>{props.children}</Popover>
    </div>
  );
}

export function TocPopoverTrigger({ items }: { items: TOCItemType[] }) {
  const { text } = useI18n();
  const active = Primitive.useActiveAnchor();
  const current = useMemo(() => {
    return items.find((item) => active === item.url.slice(1))?.title;
  }, [items, active]);

  return (
    <PopoverTrigger className="inline-flex size-full items-center gap-2 text-nowrap px-4 py-2 text-left md:px-3">
      <Text className="size-4 shrink-0" />
      {text.toc}
      {current ? (
        <>
          <ChevronRight className="-mx-1.5 size-4 shrink-0 text-fd-muted-foreground" />
          <span className="truncate text-fd-muted-foreground">{current}</span>
        </>
      ) : null}
    </PopoverTrigger>
  );
}

export function TocPopoverContent(props: PopoverContentProps) {
  return (
    <PopoverContent
      hideWhenDetached
      alignOffset={16}
      align="start"
      side="bottom"
      data-toc-popover=""
      {...props}
      className={cn(
        'flex max-h-[var(--radix-popover-content-available-height)] w-[260px] flex-col gap-4 p-3',
        props.className,
      )}
    >
      {props.children}
    </PopoverContent>
  );
}
