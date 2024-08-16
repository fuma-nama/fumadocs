import type { TOCItemType } from 'fumadocs-core/server';
import * as Primitive from 'fumadocs-core/toc';
import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';
import type { PosType } from '@/components/layout/toc';
import { ScrollArea, ScrollViewport } from '../ui/scroll-area';

export function ClerkTOCItems({
  items,
  isMenu = false,
}: {
  items: TOCItemType[];
  isMenu?: boolean;
}): React.ReactElement {
  const { text } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PosType>([0, 0]);
  const active = Primitive.useActiveAnchors();
  const [svg, setSvg] = useState<{
    path: string;
    width: number;
    height: number;
  }>();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (active.length === 0 || !container || container.clientHeight === 0) {
      setPos([0, 0]);
      return;
    }

    let upper = Number.MAX_VALUE,
      lower = 0;

    for (const item of active) {
      const element: HTMLElement | null = container.querySelector(
        `a[href="#${item}"]`,
      );
      if (!element) continue;

      upper = Math.min(upper, element.offsetTop);
      lower = Math.max(lower, element.offsetTop + element.clientHeight);
    }

    setPos([upper, lower - upper]);
  }, [active]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    function onResize(): void {
      if (container.clientHeight === 0) return;
      let w = 0,
        h = 0;
      const d: string[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const element: HTMLElement | null = container.querySelector(
          `a[href="#${item.url.slice(1)}"]`,
        );
        if (!element) continue;

        const offset = getLineOffset(item.depth) + 1,
          top = i === 0 ? element.offsetTop : element.offsetTop + 8,
          bottom =
            i === items.length - 1
              ? element.offsetTop + element.clientHeight
              : element.offsetTop + element.clientHeight - 8;

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
      <ScrollViewport
        className="relative min-h-0 text-sm text-fd-muted-foreground"
        ref={containerRef}
      >
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
            <div
              className="bg-fd-primary transition-all"
              style={{
                marginTop: pos[0],
                height: pos[1],
              }}
            />
          </div>
        ) : null}
        <Primitive.ScrollProvider containerRef={containerRef}>
          <div className="flex flex-col">
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
  return depth >= 3 ? 16 : 0;
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
  const offset = getLineOffset(item.depth);

  return (
    <Primitive.TOCItem
      href={item.url}
      style={{
        paddingInlineStart: `${getItemOffset(item.depth)}px`,
      }}
      className="relative py-2 transition-colors [overflow-wrap:anywhere] data-[active=true]:text-fd-primary"
    >
      {offset !== getLineOffset(upper) ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          className={cn(
            'absolute -top-2 start-0 size-4',
            offset < getLineOffset(upper)
              ? 'rotate-90 rtl:rotate-0'
              : 'rtl:rotate-90',
          )}
        >
          <line
            x1="0"
            y1="0"
            x2="16"
            y2="16"
            className="stroke-fd-foreground/10"
            strokeWidth="1"
          />
        </svg>
      ) : null}
      <div
        className={cn(
          'absolute inset-y-0 w-px bg-fd-foreground/10',
          offset !== getLineOffset(upper) && 'top-2',
          offset !== getLineOffset(lower) && 'bottom-2',
        )}
        style={{
          insetInlineStart: offset,
        }}
      />
      {item.title}
    </Primitive.TOCItem>
  );
}
