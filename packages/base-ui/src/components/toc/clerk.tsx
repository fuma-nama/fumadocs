'use client';
import * as Primitive from 'fumadocs-core/toc';
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/utils/cn';
import { TocThumb, useTOCItems } from '.';
import { mergeRefs } from '@/utils/merge-refs';
import { useI18n } from '@/contexts/i18n';

interface ComputedSVG {
  width: number;
  height: number;
  content: ReactNode;
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
    let upperBottom = 0;
    let upperX = 0;
    let d = '';
    const output: ReactNode[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const element: HTMLElement | null = container.querySelector(
        `a[href="#${item.url.slice(1)}"]`,
      );
      if (!element) continue;

      const styles = getComputedStyle(element);
      const x = getLineOffset(item.depth) + 0.5,
        top = element.offsetTop + parseFloat(styles.paddingTop),
        bottom = element.offsetTop + element.clientHeight - parseFloat(styles.paddingBottom);

      w = Math.max(x + 8, w);
      h = Math.max(h, bottom);

      if (i === 0) {
        d += ` M${x} ${top} L${x} ${bottom}`;
      } else {
        d += ` C ${upperX} ${top - 4} ${x} ${upperBottom + 4} ${x} ${top} L${x} ${bottom}`;
      }

      if (item._step !== undefined) {
        output.push(
          <circle
            key={`${i}-circle`}
            cx={x}
            cy={(top + bottom) / 2}
            r="8"
            className="fill-fd-primary"
          />,
          <text
            key={`${i}-text`}
            x={x}
            y={(top + bottom) / 2}
            textAnchor="middle"
            alignmentBaseline="central"
            dominantBaseline="middle"
            className="fill-fd-primary-foreground font-medium text-xs leading-none font-mono"
          >
            {item._step}
          </text>,
        );
      }

      upperX = x;
      upperBottom = bottom;
    }

    output.unshift(
      <path key="path" d={d} className="stroke-fd-primary" strokeWidth="1" fill="none" />,
    );
    setSvg({
      content: output,
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
            {svg.content}
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

interface ThumbBoxInfo {
  startIdx: number;
  endIdx: number;
  isUp: boolean;
}

function ThumbBox() {
  const items = Primitive.useItems();
  const previousRef = useRef<ThumbBoxInfo>(null);
  const startIdx = items.findIndex((item) => item.active);
  const endIdx = items.findLastIndex((item) => item.active);
  if (startIdx === -1) return;

  let isUp = false;
  if (previousRef.current) {
    const prev = previousRef.current;
    isUp =
      prev.startIdx > startIdx ||
      prev.endIdx > endIdx ||
      (prev.startIdx === startIdx && prev.endIdx === endIdx && prev.isUp);
  }

  previousRef.current = { startIdx, endIdx, isUp };
  const original = items[isUp ? startIdx : endIdx].original;

  return (
    <div
      className="absolute size-1 bg-fd-primary rounded-full transition-transform"
      style={{
        translate: `${getLineOffset(original.depth) - 1.5}px calc(${
          isUp ? 'var(--fd-top)' : 'var(--fd-top) + var(--fd-height)'
        } - 1.5px)`,
        scale: original._step !== undefined ? '0' : '1',
      }}
    />
  );
}

const a = 8;

function getItemOffset(depth: number): number {
  if (depth <= 2) return 12 + a;
  if (depth === 3) return 24 + a;
  return 36 + a;
}

function getLineOffset(depth: number): number {
  if (depth <= 2) return a;
  if (depth === 3) return 8 + a;
  return 16 + a;
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
        'group prose relative py-1.5 text-sm scroll-m-4 text-fd-muted-foreground hover:text-fd-accent-foreground transition-colors wrap-anywhere first:pt-0 last:pb-0 data-[active=true]:text-fd-primary',
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
          className="absolute -top-1.5 -z-1"
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
          'absolute inset-y-0 w-px bg-fd-foreground/10 -z-1',
          offset !== upperOffset && 'top-1.5',
          offset !== lowerOffset && 'bottom-1.5',
        )}
        style={{
          insetInlineStart: offset,
        }}
      />
      {item._step !== undefined && (
        <div
          className="absolute flex items-center justify-center -translate-1/2 -z-1 top-[calc(50%-var(--t,0px)+var(--b,0px))] size-4 font-mono font-medium text-xs bg-fd-muted text-fd-muted-foreground rounded-full leading-none group-first:[--t:--spacing(0.75)] group-last:[--b:--spacing(0.75)]"
          style={{
            insetInlineStart: offset,
          }}
        >
          {item._step}
        </div>
      )}
      {item.title}
    </Primitive.TOCItem>
  );
}
