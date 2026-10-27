'use client';
import { type CSSProperties, useCallback, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { whenSeen } from '../../lib/later';
import { TICK } from '../../lib/motion';
import { Roller } from '../../ui/text';

export interface Counter {
  label: string;
  value: number;
  /** mono readout under the value, quoting where it comes from */
  note?: string;
}

const format = new Intl.NumberFormat('en-US');

/**
 * Columns a counter spans on the wall's: halves on phones, a lone last counter filling its row;
 * 2 | 2 | 1 from md; from xl 2 | 3 under the wall, the last counter under the testimonials.
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
      // the entrance starts from zeros only once on screen, then rolls in a counter a tick
      let timer = 0;
      let count = -1;
      const next = () => {
        setPrinted(++count);
        if (count < items.length) timer = window.setTimeout(next, TICK);
      };
      const stopView = whenSeen(root, next, { threshold: 0.4 });
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
            'mt-5 text-[length:min(28px,calc(200cqw/var(--len)))] leading-none font-medium tracking-[-0.03em] text-lp-orange tabular-nums md:mt-8 md:text-5xl lg:text-[56px] xl:text-[64px] min-[87.5rem]:text-7xl',
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
