'use client';
import * as Primitive from 'fumadocs-core/toc';
import { type ComponentProps, useEffect, useEffectEvent, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { TocThumb, useTOCItems } from '.';
import { mergeRefs } from '@/utils/merge-refs';
import { useI18n } from '@/contexts/i18n';

interface ComputedSVG {
  d: string;
  width: number;
  height: number;
}

export function TOCItems({ ref, className, ...props }: ComponentProps<'div'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const items = useTOCItems();
  const { text } = useI18n();
  const [svg, setSvg] = useState<ComputedSVG>();

  const onResize = useEffectEvent(() => {
    const container = containerRef.current;
    if (!container || container.clientHeight === 0) return;
    let w = 0;
    let h = 0;
    let b0 = 0;
    let d = '';

    for (let i = 0; i < items.length; i++) {
      const element: HTMLElement | null = container.querySelector(
        `a[href="#${items[i].url.slice(1)}"]`,
      );
      if (!element) continue;

      const styles = getComputedStyle(element);
      const offset = getLineOffset(items[i].depth) + 1,
        top = element.offsetTop + parseFloat(styles.paddingTop),
        bottom = element.offsetTop + element.clientHeight - parseFloat(styles.paddingBottom);

      w = Math.max(offset, w);
      h = Math.max(h, bottom);

      if (i === 0) {
        d += ` M${offset} ${top} L${offset} ${bottom}`;
      } else {
        const pOffset = getLineOffset(items[i - 1].depth) + 1;
        d += ` C ${pOffset} ${top - 4} ${offset} ${b0! + 4} ${offset} ${top} L${offset} ${bottom}`;
      }

      b0 = bottom;
    }

    w += 1;
    setSvg({
      d,
      width: w,
      height: h,
    });
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(onResize);
    onResize();

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  if (items.length === 0)
    return (
      <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
        {text.tocNoHeadings}
      </div>
    );

  return (
    <>
      {svg && (
        <TocThumb
          containerRef={containerRef}
          className="absolute top-0 inset-s-0"
          style={{
            width: svg.width,
            height: svg.height,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${svg.width} ${svg.height}`}
            className="absolute transition-[clip-path]"
            style={{
              width: svg.width,
              height: svg.height,
              clipPath: `polygon(0 var(--fd-top), 100% var(--fd-top), 100% calc(var(--fd-top) + var(--fd-height)), 0 calc(var(--fd-top) + var(--fd-height)))`,
            }}
          >
            <path d={svg.d} className="stroke-fd-primary" strokeWidth="1" fill="none" />
          </svg>
          <ThumbBox />
        </TocThumb>
      )}
      <div ref={mergeRefs(containerRef, ref)} className={cn('flex flex-col', className)} {...props}>
        {items.map((item, i) => (
          <TOCItem
            key={item.url}
            item={item}
            upper={items[i - 1]?.depth}
            lower={items[i + 1]?.depth}
          />
        ))}
      </div>
    </>
  );
}

function ThumbBox() {
  const itemInfos = Primitive.useItems();
  const startIdx = itemInfos.findIndex((info) => info.active);
  const endIdx = itemInfos.findLastIndex((info) => info.active);
  if (startIdx === -1) return;

  let isStart: boolean;
  if (startIdx === endIdx) {
    let lastInactiveIdx = -1;
    for (let i = 0; i < itemInfos.length; i++) {
      const item = itemInfos[i];
      if (item.active) continue;
      if (lastInactiveIdx === -1 || itemInfos[lastInactiveIdx].t < item.t) {
        lastInactiveIdx = i;
      }
    }
    isStart = startIdx < lastInactiveIdx;
  } else {
    isStart = itemInfos[startIdx].t > itemInfos[endIdx].t;
  }

  return (
    <div
      className="absolute size-1 bg-fd-primary rounded-full transition-transform"
      style={{
        translate: `calc(${getLineOffset(itemInfos[isStart ? startIdx : endIdx].original.depth)}px - 1.25px) ${
          isStart ? 'var(--fd-top)' : 'calc(var(--fd-top) + var(--fd-height))'
        }`,
      }}
    />
  );
}

function getItemOffset(depth: number): number {
  if (depth <= 2) return 14;
  if (depth === 3) return 26;
  return 36;
}

function getLineOffset(depth: number): number {
  if (depth <= 2) return 2;
  if (depth === 3) return 10;
  return 20;
}

function TOCItem({
  item,
  upper = item.depth,
  lower = item.depth,
}: {
  item: Primitive.TOCItemType;
  upper?: number;
  lower?: number;
}) {
  const offset = getLineOffset(item.depth),
    upperOffset = getLineOffset(upper),
    lowerOffset = getLineOffset(lower);

  return (
    <Primitive.TOCItem
      href={item.url}
      style={{
        paddingInlineStart: getItemOffset(item.depth),
      }}
      className="prose relative py-1.5 text-sm scroll-m-4 text-fd-muted-foreground hover:text-fd-accent-foreground transition-colors wrap-anywhere first:pt-0 last:pb-0 data-[active=true]:text-fd-primary"
    >
      {offset !== upperOffset && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`${Math.min(offset, upperOffset)} 0 ${Math.abs(upperOffset - offset)} 12`}
          className="absolute -top-1.5"
          style={{
            width: Math.abs(upperOffset - offset) + 1,
            height: 12,
            insetInlineStart: Math.min(offset, upperOffset),
          }}
        >
          <path
            d={`M ${upperOffset} 0 C ${upperOffset} 8 ${offset} 4 ${offset} 12`}
            stroke="black"
            strokeWidth="1"
            fill="none"
            className="stroke-fd-foreground/10"
          />
        </svg>
      )}
      <div
        className={cn(
          'absolute inset-y-0 w-px bg-fd-foreground/10',
          offset !== upperOffset && 'top-1.5',
          offset !== lowerOffset && 'bottom-1.5',
        )}
        style={{
          insetInlineStart: offset,
        }}
      />
      {item.title}
    </Primitive.TOCItem>
  );
}
