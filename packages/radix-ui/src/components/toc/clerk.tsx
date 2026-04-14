'use client';
import * as Primitive from 'fumadocs-core/toc';
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/utils/cn';
import { useTOCItems } from '.';
import { mergeRefs } from '@/utils/merge-refs';
import { useI18n } from '@/contexts/i18n';

interface ComputedSVG {
  width: number;
  height: number;
  content: ReactNode;
  d: string;
  positions: [top: number, bottom: number, x: number][];
  itemLineLengths: [top: number, bottom: number][];
}

export interface TOCItemsProps extends ComponentProps<'div'> {
  thumbBox?: boolean;
}

export function TOCItems({ ref, className, thumbBox = true, ...props }: TOCItemsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const items = useTOCItems();
  const [svg, setSvg] = useState<ComputedSVG | null>(null);

  const onPrint = useCallback(() => {
    const container = containerRef.current;
    if (!container || container.clientHeight === 0) return;
    if (items.length === 0) {
      setSvg(null);
      return;
    }
    let w = 0;
    let h = 0;
    let d = '';
    const positions: [top: number, bottom: number, x: number][] = [];
    const output: ReactNode[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const element: HTMLElement | null = container.querySelector(`a[href="${item.url}"]`);
      if (!element) continue;

      const styles = getComputedStyle(element);
      const x = getLineOffset(item.depth) + 0.5;
      const top = element.offsetTop + parseFloat(styles.paddingTop);
      const bottom = element.offsetTop + element.clientHeight - parseFloat(styles.paddingBottom);

      w = Math.max(x + 8, w);
      h = Math.max(h, bottom);

      if (i === 0) {
        d += ` M${x} ${top} L${x} ${bottom}`;
      } else {
        const [, upperBottom, upperX] = i > 0 ? positions[i - 1] : [0, 0, 0];

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

      positions.push([top, bottom, x]);
    }

    output.unshift(
      <path key="path" d={d} className="stroke-fd-primary" strokeWidth="1" fill="none" />,
    );

    const itemLineLengths: [top: number, bottom: number][] = [];

    if (thumbBox) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      let l = 0;
      for (const [top, bottom] of positions) {
        while (path.getPointAtLength(l).y < top) l++;
        const topL = l;
        while (path.getPointAtLength(l).y < bottom) l++;

        itemLineLengths.push([topL, l]);
      }
    }

    setSvg({
      content: output,
      width: w,
      height: h,
      d,
      itemLineLengths,
      positions,
    });
  }, [items, thumbBox]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(onPrint);
    observer.observe(container);
    onPrint();
    return () => {
      observer.unobserve(container);
    };
  }, [onPrint]);

  return (
    <>
      {svg && <ThumbTrack computed={svg} thumbBox={thumbBox} />}
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

function ThumbTrack({ computed, thumbBox }: { computed: ComputedSVG; thumbBox: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const previousRef = useRef<ThumbBoxInfo>(null);
  const tocInfo = Primitive.useTOC();
  const onUpdate = useCallback(
    (items: Primitive.TOCItemInfo[]) => {
      const svg = svgRef.current;
      if (!svg) return;

      const startIdx = items.findIndex((item) => item.active);
      if (startIdx === -1) return;

      const endIdx = items.findLastIndex((item) => item.active);
      svg.style.setProperty('--track-top', `${computed.positions[startIdx][0]}px`);
      svg.style.setProperty('--track-bottom', `${computed.positions[endIdx][1]}px`);

      const box = boxRef.current;
      if (box) {
        let isUp = false;
        if (previousRef.current) {
          const prev = previousRef.current;
          isUp =
            prev.startIdx > startIdx ||
            prev.endIdx > endIdx ||
            (prev.startIdx === startIdx && prev.endIdx === endIdx && prev.isUp);
        }

        previousRef.current = { startIdx, endIdx, isUp };

        box.style.setProperty(
          '--offset-distance',
          isUp
            ? `${computed.itemLineLengths[startIdx][0]}px`
            : `${computed.itemLineLengths[endIdx][1]}px`,
        );
        box.style.setProperty(
          '--opacity',
          items[isUp ? startIdx : endIdx].original._step !== undefined ? '0' : '1',
        );
      }
    },
    [computed],
  );
  Primitive.useTOCListener(onUpdate);

  useEffect(() => {
    onUpdate(tocInfo.get());
  }, [onUpdate, tocInfo]);

  return (
    <div
      className="absolute top-0 inset-s-0"
      style={{
        width: computed.width,
        height: computed.height,
      }}
    >
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${computed.width} ${computed.height}`}
        className="absolute transition-[clip-path]"
        style={{
          width: computed.width,
          height: computed.height,
          clipPath: `polygon(0 var(--track-top,0), 100% var(--track-top,0), 100% var(--track-bottom,0), 0 var(--track-bottom,0))`,
        }}
      >
        {computed.content}
      </svg>
      {thumbBox && (
        <div
          ref={boxRef}
          className="absolute size-1 bg-fd-primary rounded-full [offset-distance:var(--offset-distance,0)] opacity-(--opacity,0) transition-[opacity,offset-distance]"
          style={{
            offsetPath: `path("${computed.d}")`,
          }}
        />
      )}
    </div>
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
