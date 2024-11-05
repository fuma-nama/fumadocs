'use client';
import { Text } from 'lucide-react';
import type { TOCItemType } from 'fumadocs-core/server';
import * as Primitive from 'fumadocs-core/toc';
import { type HTMLAttributes, type ReactNode, useRef } from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';
import { TocThumb } from '@/components/layout/toc-thumb';
import { ScrollArea, ScrollViewport } from '../ui/scroll-area';

export interface TOCProps {
  /**
   * Custom content in TOC container, before the main TOC
   */
  header?: ReactNode;

  /**
   * Custom content in TOC container, after the main TOC
   */
  footer?: ReactNode;

  children: ReactNode;
}

export function Toc(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      data-toc=""
      className={cn(
        'sticky top-fd-layout-top h-[var(--fd-toc-height)] flex-1 pb-2 pe-2 pt-12 max-lg:hidden',
        props.className,
      )}
      style={
        {
          ...props.style,
          '--fd-toc-height':
            'calc(100dvh - var(--fd-banner-height) - var(--fd-nav-height))',
        } as object
      }
    >
      {props.children}
    </div>
  );
}

export function TocTitle() {
  const { text } = useI18n();

  return (
    <h3 className="-ms-0.5 inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground">
      <Text className="size-4" />
      {text.toc}
    </h3>
  );
}

export function TOCItems({
  items,
  isMenu = false,
}: {
  items: TOCItemType[];
  isMenu?: boolean;
}) {
  const { text } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  if (items.length === 0)
    return (
      <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
        {text.tocNoHeadings}
      </div>
    );

  return (
    <ScrollArea className={cn('flex flex-col', isMenu && '-ms-3')}>
      <Primitive.ScrollProvider containerRef={viewRef}>
        <ScrollViewport className="relative min-h-0 text-sm" ref={viewRef}>
          <TocThumb
            containerRef={containerRef}
            className="absolute start-0 mt-[var(--fd-top)] h-[var(--fd-height)] w-px bg-fd-primary transition-all"
          />
          <div
            ref={containerRef}
            className={cn(
              'flex flex-col',
              !isMenu && 'border-s border-fd-foreground/10',
            )}
          >
            {items.map((item) => (
              <TOCItem key={item.url} item={item} />
            ))}
          </div>
        </ScrollViewport>
      </Primitive.ScrollProvider>
    </ScrollArea>
  );
}

function TOCItem({ item }: { item: TOCItemType }) {
  return (
    <Primitive.TOCItem
      href={item.url}
      className={cn(
        'prose py-1.5 text-sm text-fd-muted-foreground transition-colors [overflow-wrap:anywhere] first:pt-0 last:pb-0 data-[active=true]:text-fd-primary',
        item.depth <= 2 && 'ps-3.5',
        item.depth === 3 && 'ps-6',
        item.depth >= 4 && 'ps-8',
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  );
}
