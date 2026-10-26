'use client';
import { type CSSProperties, useCallback, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { whenSeen } from '../../lib/later';
import { TICK } from '../../lib/motion';
import { Roller } from '../../ui/roller';

export interface Counter {
  label: string;
  value: number;
  /** mono readout under the value, quoting where it comes from */
  note?: string;
}

const format = new Intl.NumberFormat('en-US');

/**
 * Columns a counter spans, on the wall's columns: halves on phones with a lone last counter filling
 * its row, one row of 2 | 2 | 1 from md, and from xl 2 | 3 under the wall with the last counter
 * under the testimonials. A row gives two columns each and the rest to its last counter.
 */
function spans(i: number, count: number): CSSProperties {
  const last = i === count - 1;
  return {
    '--span': count % 2 === 1 && last ? 2 : 1,
    '--span-md': last ? 5 - 2 * i : 2,
    '--span-xl': last ? 1 : i === count - 2 ? 5 - 2 * i : 2,
  } as CSSProperties;
}

/** the counters under the wall and the testimonials, from xl a subgrid of their two columns */
export function Counters({ items }: { items: Counter[] }) {
  const reduced = useReducedMotion();
  // counters rolled in so far, `null` at rest (the final numbers)
  const [printed, setPrinted] = useState<number | null>(null);

  const ref = useCallback(
    (root: HTMLDivElement | null) => {
      if (!root || reduced) return;
      let timer = 0;
      let count = 0;
      const next = () => {
        setPrinted(++count);
        if (count < items.length) timer = window.setTimeout(next, TICK);
      };
      const stopView = whenSeen(
        root,
        () => {
          // the entrance starts from zeros only now, on screen
          setPrinted(0);
          timer = window.setTimeout(next, TICK);
        },
        { threshold: 0.4 },
      );
      return () => {
        stopView();
        clearTimeout(timer);
        setPrinted(null);
      };
    },
    [reduced, items.length],
  );

  const cells = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const text = format.format(item.value);
    const shown = printed === null || i < printed;

    cells.push(
      <div
        key={item.label}
        style={{ '--len': text.length, ...spans(i, items.length) } as CSSProperties}
        className="col-span-(--span) flex flex-col bg-lp-paper p-4 @container md:col-span-(--span-md) md:py-5 xl:col-span-(--span-xl)"
      >
        <dt className="text-[15px] leading-tight">{item.label}</dt>
        <dd
          className={cn(
            // a long number keeps to its cell on a narrow phone: a digit is under half an em
            'mt-5 font-pixel text-[length:min(28px,calc(200cqw/var(--len)))] leading-none text-lp-orange tabular-nums md:mt-8 md:text-5xl lg:text-[56px] xl:text-[64px] min-[87.5rem]:text-7xl',
            shown
              ? "transition-[font-variation-settings] duration-250 ease-[steps(4,end)] [font-variation-settings:'ELSH'_0]"
              : "[font-variation-settings:'ELSH'_20]",
          )}
        >
          <Roller
            key={printed === null ? 'rest' : 'roll'}
            value={shown ? text : text.replace(/\d/g, '0')}
            step={TICK / 3}
            stagger={TICK / 8}
          />
        </dd>
        {item.note && <dd className="mt-3 font-mono text-xs text-lp-ink-2">{item.note}</dd>}
      </div>,
    );
  }
  const last = cells.pop();

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 gap-px border border-lp-line-strong bg-lp-line-strong md:grid-cols-5 xl:col-span-full xl:grid-cols-subgrid xl:gap-[normal] xl:border-0 xl:bg-transparent"
    >
      {cells.length > 0 && (
        <dl className="contents xl:grid xl:grid-cols-5 xl:gap-px xl:border xl:border-lp-line-strong xl:bg-lp-line-strong">
          {cells}
        </dl>
      )}
      <dl className="contents xl:col-start-2 xl:grid xl:border xl:border-lp-line-strong xl:bg-lp-line-strong">
        {last}
      </dl>
    </div>
  );
}
