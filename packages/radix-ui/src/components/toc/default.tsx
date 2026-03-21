'use client';
import { useI18n } from '@/contexts/i18n';
import { cn } from '@/utils/cn';
import { type ComponentProps, useRef } from 'react';
import { mergeRefs } from '@/utils/merge-refs';
import { TocThumb, useTOCItems } from '.';
import * as Primitive from 'fumadocs-core/toc';

export function TOCItems({ ref, className, ...props }: ComponentProps<'div'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const items = useTOCItems();
  const { text } = useI18n();

  if (items.length === 0)
    return (
      <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
        {text.tocNoHeadings}
      </div>
    );

  return (
    <>
      <TocThumb
        containerRef={containerRef}
        align="center"
        className="absolute top-(--fd-top) h-(--fd-height) w-px bg-linear-to-t via-fd-primary transition-[top,height] delay-25"
      >
        <div className="absolute top-0 -translate-y-1/2 size-1 rounded-e-full bg-fd-primary" />
        <div className="absolute bottom-0 translate-y-1/2 size-1 rounded-e-full bg-fd-primary" />
      </TocThumb>
      <div
        ref={mergeRefs(ref, containerRef)}
        className={cn('flex flex-col border-s border-fd-foreground/10', className)}
        {...props}
      >
        {items.map((item) => (
          <TOCItem key={item.url} item={item} />
        ))}
      </div>
    </>
  );
}

function TOCItem({ item }: { item: Primitive.TOCItemType }) {
  return (
    <Primitive.TOCItem
      href={item.url}
      className={cn(
        'prose py-1.5 text-sm text-fd-muted-foreground transition-colors delay-25 wrap-anywhere first:pt-0 last:pb-0 data-[active=true]:text-fd-primary hover:text-fd-accent-foreground hover:delay-0',
        item.depth <= 2 && 'ps-3',
        item.depth === 3 && 'ps-6',
        item.depth >= 4 && 'ps-8',
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  );
}
