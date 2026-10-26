'use client';
import * as Primitive from 'fumadocs-core/toc';
import { type ComponentProps, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { useTOCItems } from '.';
import { useTranslations } from '@fuma-translate/react';

export type TOCItemsProps = ComponentProps<'div'>;

export function TOCItems({ className, children, ...props }: TOCItemsProps) {
  const items = useTOCItems();

  return (
    <div className={cn('relative flex flex-col', className)} {...props}>
      {items.length > 0 && <ThumbTrack items={items} />}
      {children}
    </div>
  );
}

export function TOCEmpty() {
  const t = useTranslations({ note: 'table of contents' });

  return (
    <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
      {t('No Headings')}
    </div>
  );
}

interface ItemPosition {
  x: number;
  top: number;
  bottom: number;
}

function ThumbTrack({ items }: { items: Primitive.TOCItemType[] }) {
  const toc = Primitive.useTOC();
  const ref = useCallback(
    (track: HTMLDivElement) => {
      const container = track.parentElement!;
      const svg = track.querySelector('svg')!;
      const path = svg.querySelector('path')!;
      const steps = svg.getElementsByTagName('g');
      const positions = new Map<string, ItemPosition>();

      const update = (infos: Primitive.TOCItemInfo[]) => {
        let top = -1;
        let bottom = -1;
        for (const info of infos) {
          const position = info.active ? positions.get(info.original.url) : undefined;
          if (!position) continue;
          if (top === -1) top = position.top;
          bottom = position.bottom;
        }
        if (top !== -1)
          svg.style.clipPath = `polygon(0 ${top}px, 100% ${top}px, 100% ${bottom}px, 0 ${bottom}px)`;
      };

      // called after layout and before paint, so the track never lags behind the items
      const observer = new ResizeObserver(() => {
        if (container.clientHeight === 0) return;
        const anchors = new Map<string | null, HTMLElement>();
        for (const anchor of container.getElementsByTagName('a'))
          anchors.set(anchor.getAttribute('href'), anchor);

        let d = '';
        let width = 0;
        let height = 0;
        let last: ItemPosition | undefined;
        positions.clear();

        for (const item of items) {
          const anchor = anchors.get(item.url);
          if (!anchor) continue;

          const styles = getComputedStyle(anchor);
          const x = getLineOffset(item.depth) + 0.5;
          const top = anchor.offsetTop + parseFloat(styles.paddingTop);
          const bottom = anchor.offsetTop + anchor.clientHeight - parseFloat(styles.paddingBottom);

          d += last ? ` L ${last.x} ${last.bottom} ${x} ${top}` : `M${x} ${top}`;
          d += ` L${x} ${bottom}`;
          last = { x, top, bottom };
          positions.set(item.url, last);
          width = Math.max(width, x + 8);
          height = Math.max(height, bottom);
        }

        // write after all reads, a write between them forces another layout
        let step = 0;
        for (const item of items) {
          if (item._step === undefined) continue;
          const position = positions.get(item.url);
          const g = steps[step++];
          if (position)
            g.setAttribute(
              'transform',
              `translate(${position.x}, ${(position.top + position.bottom) / 2})`,
            );
        }
        path.setAttribute('d', d);
        track.style.width = `${width}px`;
        track.style.height = `${height}px`;
        update(toc.get());
      });

      observer.observe(container);
      toc.listen(update);
      return () => {
        observer.disconnect();
        toc.unlisten(update);
      };
    },
    [items, toc],
  );

  return (
    <div ref={ref} className="absolute top-0 inset-s-0 origin-center rtl:-scale-x-100">
      <svg className="absolute size-full [clip-path:polygon(0_0,100%_0,100%_0,0_0)] transition-[clip-path]">
        <path className="stroke-fd-primary" strokeWidth="1" fill="none" />
        {items.map(
          (item) =>
            item._step !== undefined && (
              <g key={item.url}>
                <circle r="8" className="fill-fd-primary" />
                <text
                  textAnchor="middle"
                  alignmentBaseline="central"
                  dominantBaseline="middle"
                  className="fill-fd-primary-foreground font-medium text-xs leading-none font-mono rtl:-scale-x-100"
                >
                  {item._step}
                </text>
              </g>
            ),
        )}
      </svg>
    </div>
  );
}

const BASE = 8;

function getItemOffset(depth: number): number {
  if (depth <= 2) return 12 + BASE;
  if (depth === 3) return 24 + BASE;
  return 36 + BASE;
}

function getLineOffset(depth: number): number {
  if (depth <= 2) return BASE;
  if (depth === 3) return 12 + BASE;
  return 24 + BASE;
}

export function TOCItem({
  item,
  ...props
}: Primitive.TOCItemProps & { item: Primitive.TOCItemType }) {
  const items = useTOCItems();
  const { isFirst, isLast, svg } = useMemo(() => {
    const index = items.indexOf(item);
    const isFirst = index === 0;
    const isLast = index === items.length - 1;

    const l1 = getLineOffset(item.depth);
    const l0 = isFirst ? l1 : getLineOffset(items[index - 1].depth);
    const l2 = isLast ? l1 : getLineOffset(items[index + 1].depth);

    return {
      isFirst,
      isLast,
      svg: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={cn(
            'absolute -top-1.5 inset-s-0 bottom-0 h-[calc(100%+--spacing(1.5))] -z-1 rtl:-scale-x-100',
            l1 !== l2 && 'h-full bottom-1.5',
          )}
          style={{
            width: Math.max(l0, l1) + 9,
          }}
        >
          {l0 !== l1 && (
            <path
              d={`M ${l0 + 0.5} 0 L ${l0 + 0.5} 0 ${l1 + 0.5} 12`}
              stroke="black"
              strokeWidth="1"
              fill="none"
              className="stroke-fd-foreground/10"
            />
          )}
          <line
            x1={l1 + 0.5}
            y1={l0 === l1 ? '6' : '12'}
            x2={l1 + 0.5}
            y2="100%"
            strokeWidth="1"
            className="stroke-fd-foreground/10"
          />
          {item._step !== undefined && (
            <g transform={`translate(${l1 + 0.5}, ${l1 === l2 ? '3' : '6'})`}>
              <circle cx="0" cy="50%" r="8" className="fill-fd-muted" />
              <text
                x="0"
                y="50%"
                textAnchor="middle"
                alignmentBaseline="central"
                dominantBaseline="middle"
                className="fill-fd-muted-foreground font-medium text-xs leading-none font-mono rtl:-scale-x-100"
              >
                {item._step}
              </text>
            </g>
          )}
        </svg>
      ),
    };
  }, [items, item]);

  return (
    <Primitive.TOCItem
      href={item.url}
      {...props}
      className={cn(
        'prose prose-sm relative py-1.5 scroll-m-4 text-fd-muted-foreground hover:text-fd-accent-foreground transition-colors wrap-anywhere data-[active=true]:text-fd-primary',
        isFirst && 'pt-0',
        isLast && 'pb-0',
        props.className,
      )}
      style={{
        paddingInlineStart: getItemOffset(item.depth),
        ...props.style,
      }}
    >
      {svg}
      {item.title}
    </Primitive.TOCItem>
  );
}
