'use client';
import * as Primitive from 'fumadocs-core/toc';
import { type ComponentProps, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
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

    setSvg({
      d,
      width: w + 1,
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
      <div
        ref={mergeRefs(containerRef, ref)}
        className={cn('flex flex-col', className)}
        {...props}
      />
    </>
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

function ThumbBox() {
  const items = Primitive.useItems();
  let startIdx = -1;
  let endIdx = -1;
  let lastInactiveIdx = -1;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.active) {
      if (startIdx === -1) startIdx = i;
      endIdx = i;
    } else if (lastInactiveIdx === -1 || items[lastInactiveIdx].t < item.t) {
      lastInactiveIdx = i;
    }
  }

  if (startIdx === -1) return;
  const isStart = endIdx < lastInactiveIdx;
  return (
    <div
      className="absolute size-1 bg-fd-primary rounded-full transition-transform"
      style={{
        translate: `calc(${getLineOffset(items[isStart ? startIdx : endIdx].original.depth)}px - 1.25px) ${
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

export function TOCItem({
  item,
  ...props
}: Primitive.TOCItemProps & { item: Primitive.TOCItemType }) {
  const items = useTOCItems();
  const { lowerOffset, offset, upperOffset } = useMemo(() => {
    const index = items.indexOf(item);
    const offset = getLineOffset(item.depth);
    return {
      offset,
      upperOffset: index > 0 ? getLineOffset(items[index - 1].depth) : offset,
      lowerOffset: index + 1 < items.length ? getLineOffset(items[index + 1].depth) : offset,
    };
  }, [items, item]);

  return (
    <Primitive.TOCItem
      href={item.url}
      {...props}
      className={cn(
        'prose relative py-1.5 text-sm scroll-m-4 text-fd-muted-foreground hover:text-fd-accent-foreground transition-colors wrap-anywhere first:pt-0 last:pb-0 data-[active=true]:text-fd-primary',
        props.className,
      )}
      style={{
        paddingInlineStart: getItemOffset(item.depth),
        ...props.style,
      }}
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
