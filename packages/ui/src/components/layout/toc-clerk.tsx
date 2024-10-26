'use client';
import type { TOCItemType } from 'fumadocs-core/server';
import * as Primitive from 'fumadocs-core/toc';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';
import { TocThumb } from '@/components/layout/toc-thumb';
import { ScrollArea, ScrollViewport } from '../ui/scroll-area';

export default function ClerkTOCItems({
  items,
  isMenu = false,
}: {
  items: TOCItemType[];
  isMenu?: boolean;
}): React.ReactElement {
  const { text } = useI18n();
  const viewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [svg, setSvg] = useState<{
    path: string;
    width: number;
    height: number;
  }>();

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    function onResize(): void {
      if (container.clientHeight === 0) return;
      let w = 0,
        h = 0;
      const d: string[] = [];
      for (let i = 0; i < items.length; i++) {
        const element: HTMLElement | null = container.querySelector(
          `a[href="#${items[i].url.slice(1)}"]`,
        );
        if (!element) continue;

        const styles = getComputedStyle(element);
        const offset = getLineOffset(items[i].depth) + 1,
          top = element.offsetTop + parseFloat(styles.paddingTop),
          bottom =
            element.offsetTop +
            element.clientHeight -
            parseFloat(styles.paddingBottom);

        w = Math.max(offset, w);
        h = Math.max(h, bottom);

        d.push(`${i === 0 ? 'M' : 'L'}${offset} ${top}`);
        d.push(`L${offset} ${bottom}`);
      }

      setSvg({
        path: d.join(' '),
        width: w + 1,
        height: h,
      });
    }

    const observer = new ResizeObserver(onResize);
    onResize();

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [items]);

  if (items.length === 0)
    return (
      <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
        {text.tocNoHeadings}
      </div>
    );

  return (
    <ScrollArea className={cn('flex flex-col', isMenu && '-ms-3')}>
      <ScrollViewport className="relative min-h-0" ref={viewRef}>
        {svg ? (
          <div
            className="absolute start-0 top-0 rtl:-scale-x-100"
            style={{
              width: svg.width,
              height: svg.height,
              maskImage: `url("data:image/svg+xml,${
                // Inline SVG
                encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svg.width} ${svg.height}"><path d="${svg.path}" stroke="black" stroke-width="1" fill="none" /></svg>`,
                )
              }")`,
            }}
          >
            <TocThumb
              containerRef={containerRef}
              className="mt-[var(--fd-top)] h-[var(--fd-height)] bg-fd-primary transition-all"
            />
          </div>
        ) : null}
        <Primitive.ScrollProvider containerRef={viewRef}>
          <div className="flex flex-col" ref={containerRef}>
            {items.map((item, i) => (
              <TOCItem
                key={item.url}
                item={item}
                upper={items[i - 1]?.depth}
                lower={items[i + 1]?.depth}
              />
            ))}
          </div>
        </Primitive.ScrollProvider>
      </ScrollViewport>
    </ScrollArea>
  );
}

function getItemOffset(depth: number): number {
  if (depth <= 2) return 16;
  if (depth === 3) return 32;
  return 48;
}

function getLineOffset(depth: number): number {
  return depth >= 3 ? 12 : 0;
}

function TOCItem({
  item,
  upper = item.depth,
  lower = item.depth,
}: {
  item: TOCItemType;
  upper?: number;
  lower?: number;
}): React.ReactElement {
  const offset = getLineOffset(item.depth),
    upperOffset = getLineOffset(upper),
    lowerOffset = getLineOffset(lower);

  return (
    <Primitive.TOCItem
      href={item.url}
      style={{
        paddingInlineStart: getItemOffset(item.depth),
      }}
      className="prose relative py-2 text-sm text-fd-muted-foreground transition-colors [overflow-wrap:anywhere] first:pt-0 last:pb-0 data-[active=true]:text-fd-primary"
    >
      {offset !== upperOffset ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          className="absolute -top-2 start-0 size-4 rtl:-scale-x-100"
        >
          <line
            x1={upperOffset}
            y1="0"
            x2={offset}
            y2="16"
            className="stroke-fd-foreground/10"
            strokeWidth="1"
          />
        </svg>
      ) : null}
      <div
        className={cn(
          'absolute inset-y-0 w-px bg-fd-foreground/10',
          offset !== upperOffset && 'top-2',
          offset !== lowerOffset && 'bottom-2',
        )}
        style={{
          insetInlineStart: offset,
        }}
      />
      {item.title}
    </Primitive.TOCItem>
  );
}
