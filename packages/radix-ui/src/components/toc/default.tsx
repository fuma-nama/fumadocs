'use client';
import * as Primitive from 'fumadocs-core/toc';
import { type ComponentProps, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { useTOCItems } from '.';
import { useTranslations } from '@fuma-translate/react';

export interface TOCItemsProps extends ComponentProps<'div'> {
  thumbBox?: boolean;
}

export function TOCItems({ className, thumbBox = true, children, ...props }: TOCItemsProps) {
  const items = useTOCItems();

  return (
    <div className={cn('relative flex flex-col', className)} {...props}>
      {items.length > 0 && <ThumbTrack items={items} thumbBox={thumbBox} />}
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
  /** length of the track until `top` */
  offset: number;
}

function ThumbTrack({ items, thumbBox }: { items: Primitive.TOCItemType[]; thumbBox: boolean }) {
  const toc = Primitive.useTOC();
  const ref = useCallback(
    (track: HTMLDivElement) => {
      const container = track.parentElement!;
      const svg = track.querySelector('svg')!;
      const path = svg.querySelector('path')!;
      const steps = svg.getElementsByTagName('g');
      const thumb = thumbBox ? track.querySelector('div') : null;
      const segment = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const positions = new Map<string, ItemPosition>();
      let previous: { start: number; end: number; isUp: boolean } | undefined;

      const update = (infos: Primitive.TOCItemInfo[]) => {
        let start = -1;
        let end = -1;
        for (let i = 0; i < infos.length; i++) {
          if (!infos[i].active || !positions.has(infos[i].original.url)) continue;
          if (start === -1) start = i;
          end = i;
        }
        if (start === -1) return;

        const first = positions.get(infos[start].original.url)!;
        const last = positions.get(infos[end].original.url)!;
        svg.style.clipPath = `polygon(0 ${first.top}px, 100% ${first.top}px, 100% ${last.bottom}px, 0 ${last.bottom}px)`;
        if (!thumb) return;

        const isUp =
          previous !== undefined &&
          (previous.start > start ||
            previous.end > end ||
            (previous.start === start && previous.end === end && previous.isUp));
        previous = { start, end, isUp };
        thumb.style.offsetDistance = `${isUp ? first.offset : last.offset + last.bottom - last.top}px`;
        thumb.style.opacity = infos[isUp ? start : end].original._step === undefined ? '1' : '0';
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
        let length = 0;
        let last: ItemPosition | undefined;
        positions.clear();

        for (const item of items) {
          const anchor = anchors.get(item.url);
          if (!anchor) continue;

          const styles = getComputedStyle(anchor);
          const x = getLineOffset(item.depth) + 0.5;
          const top = anchor.offsetTop + parseFloat(styles.paddingTop);
          const bottom = anchor.offsetTop + anchor.clientHeight - parseFloat(styles.paddingBottom);

          if (last) {
            const curve = `C ${last.x} ${top - 4} ${x} ${last.bottom + 4} ${x} ${top}`;
            d += ` ${curve} L${x} ${bottom}`;
            if (thumb) {
              segment.setAttribute('d', `M${last.x} ${last.bottom} ${curve}`);
              length += segment.getTotalLength();
            }
          } else {
            d += `M${x} ${top} L${x} ${bottom}`;
          }

          last = { x, top, bottom, offset: length };
          positions.set(item.url, last);
          length += bottom - top;
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
        if (thumb) thumb.style.offsetPath = `path("${d}")`;
        update(toc.get());
      });

      observer.observe(container);
      toc.listen(update);
      return () => {
        observer.disconnect();
        toc.unlisten(update);
      };
    },
    [items, thumbBox, toc],
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
      {thumbBox && (
        <div className="absolute left-0 size-1 bg-fd-primary rounded-full opacity-0 transition-[opacity,offset-distance]" />
      )}
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
  if (depth === 3) return 8 + BASE;
  return 16 + BASE;
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
              d={`M ${l0 + 0.5} 0 C ${l0 + 0.5} 8 ${l1 + 0.5} 4 ${l1 + 0.5} 12`}
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
