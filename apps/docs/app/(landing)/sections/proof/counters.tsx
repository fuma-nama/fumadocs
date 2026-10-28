'use client';
import { type CSSProperties, type ReactNode, useCallback, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { whenSeen } from '../../lib/later';
import { TICK } from '../../lib/motion';
import { Roller } from '../../ui/text';

export interface Counter {
  label: string;
  value: number;
  /** where the reading comes from: a repository or a package */
  source: string;
}

const format = new Intl.NumberFormat('en-US');

/** `path` with a break opportunity after each slash */
function breakable(path: string): ReactNode[] {
  const out: ReactNode[] = [];
  const parts = path.split('/');
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) out.push('/', <wbr key={i} />);
    out.push(parts[i]);
  }
  return out;
}

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

/**
 * The counters under the wall and the testimonials, from xl a subgrid of their two columns. A column
 * is never narrower than its number: a long one widens its column instead of overflowing.
 */
export function Counters({ items }: { items: Counter[] }) {
  const reduced = useReducedMotion();
  // counters rolled in so far, `null` at rest (the final numbers)
  const [printed, setPrinted] = useState<number | null>(null);

  const ref = useCallback(
    (root: HTMLDivElement | null) => {
      // counters the reader hasn't reached start from zeros once on screen, then roll in a counter
      // a tick; ones already in view keep their numbers
      if (!root || reduced || root.getBoundingClientRect().top < window.innerHeight) return;
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
        style={spans(i, items.length)}
        className="col-span-(--span) flex flex-col bg-lp-paper p-4 md:col-span-(--span-md) md:py-5 xl:col-span-(--span-xl)"
      >
        {/* a meter's plate: its name, a hairline on to where the reading comes from; a narrow cell
            takes the source under the name, a path after its slash, the hairline staying with
            the name, and the reading keeps to the cell's foot, so a row's readings stay level */}
        <dt className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="flex flex-1 items-center gap-2 font-pixel after:h-px after:min-w-2 after:flex-1 after:bg-lp-line-strong">
            {item.label}
          </span>
          <span className="font-mono text-lp-ink-2">{breakable(item.source)}</span>
        </dt>
        <dd className="mt-auto pt-2 font-pixel text-[28px] leading-none text-lp-orange md:pt-4 md:text-5xl lg:text-[56px] xl:text-[64px] min-[87.5rem]:text-7xl">
          <Roller
            key={printed === null ? 'rest' : 'roll'}
            value={shown ? text : text.replace(/\d/g, '0')}
            step={TICK / 3}
            stagger={TICK / 8}
          />
        </dd>
      </div>,
    );
  }
  const last = cells.pop();

  return (
    <div
      ref={ref}
      className="grid grid-cols-[repeat(2,minmax(min-content,1fr))] gap-px border border-lp-line-strong bg-lp-line-strong md:grid-cols-[repeat(5,minmax(min-content,1fr))] xl:col-span-full xl:grid-cols-subgrid xl:gap-[normal] xl:border-0 xl:bg-transparent"
    >
      {cells.length > 0 && (
        <dl className="contents xl:grid xl:grid-cols-[repeat(5,minmax(min-content,1fr))] xl:gap-px xl:border xl:border-lp-line-strong xl:bg-lp-line-strong">
          {cells}
        </dl>
      )}
      <dl className="contents xl:col-start-2 xl:grid xl:border xl:border-lp-line-strong xl:bg-lp-line-strong">
        {last}
      </dl>
    </div>
  );
}
