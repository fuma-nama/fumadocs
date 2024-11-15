'use client';
import { useMemo } from 'react';
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
import type {
  PopoverContentProps,
  PopoverTriggerProps,
} from '@radix-ui/react-popover';

export const TocPopover = Popover;

export function TocPopoverTrigger({
  items,
  ...props
}: PopoverTriggerProps & { items: TOCItemType[] }) {
  const { text } = useI18n();
  const active = Primitive.useActiveAnchor();
  const current = useMemo(() => {
    return items.find((item) => active === item.url.slice(1))?.title;
  }, [items, active]);

  return (
    <PopoverTrigger
      {...props}
      className={cn(
        'inline-flex items-center gap-2 text-nowrap px-4 py-2 text-start',
        props.className,
      )}
    >
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
