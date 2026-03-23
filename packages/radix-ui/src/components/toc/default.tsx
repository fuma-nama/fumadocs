'use client';
import { useI18n } from '@/contexts/i18n';
import { cn } from '@/utils/cn';
import { type ComponentProps, useRef } from 'react';
import { mergeRefs } from '@/utils/merge-refs';
import { TocThumb } from '.';
import * as Primitive from 'fumadocs-core/toc';

export function TOCItems({ ref, className, ...props }: ComponentProps<'div'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <TocThumb
        containerRef={containerRef}
        className="absolute inset-y-0 inset-s-0 bg-fd-primary w-px transition-[clip-path]"
        style={{
          clipPath:
            'polygon(0 var(--fd-top), 100% var(--fd-top), 100% calc(var(--fd-top) + var(--fd-height)), 0 calc(var(--fd-top) + var(--fd-height)))',
        }}
      />
      <div
        ref={mergeRefs(ref, containerRef)}
        className={cn('flex flex-col border-s border-fd-foreground/10', className)}
        {...props}
      />
    </div>
  );
}

export function TOCEmpty() {
  const { text } = useI18n();

  return (
    <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
      {text.tocNoHeadings}
    </div>
  );
}

export function TOCItem({
  item,
  ...props
}: Primitive.TOCItemProps & { item: Primitive.TOCItemType }) {
  return (
    <Primitive.TOCItem
      href={item.url}
      {...props}
      className={cn(
        'prose py-1.5 text-sm text-fd-muted-foreground scroll-m-4 transition-colors wrap-anywhere first:pt-0 last:pb-0 data-[active=true]:text-fd-primary hover:text-fd-accent-foreground',
        item.depth <= 2 && 'ps-3',
        item.depth === 3 && 'ps-6',
        item.depth >= 4 && 'ps-8',
        props.className,
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  );
}
