'use client';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { TICK } from '../../lib/motion';
import { useIsClient } from '../../lib/use-is-client';
import { Roller } from '../../ui/roller';

export interface Counter {
  label: string;
  value: number;
  /** mono readout under the value, quoting where it comes from */
  note?: string;
}

const format = new Intl.NumberFormat('en-US');

export function Counters({ items }: { items: Counter[] }) {
  const isClient = useIsClient();
  const reduced = useReducedMotion();
  const live = isClient && !reduced;
  const ref = useRef<HTMLDListElement>(null);
  // counters rolled in so far, `null` at rest (the final numbers)
  const [printed, setPrinted] = useState<number | null>(null);

  useEffect(() => {
    if (!live) return;
    let timer = 0;
    let count = 0;
    const next = () => {
      setPrinted(++count);
      if (count < items.length) timer = window.setTimeout(next, TICK * 2);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        // the entrance starts from zeros only now, on screen
        setPrinted(0);
        timer = window.setTimeout(next, TICK);
      },
      { threshold: 0.4 },
    );
    observer.observe(ref.current!);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      setPrinted(null);
    };
  }, [live, items.length]);

  let columns = '';
  for (const item of items) columns += `${format.format(item.value).length + 4}fr `;

  return (
    <dl
      ref={ref}
      style={{ '--cols': columns } as CSSProperties}
      className="grid grid-cols-2 gap-px border border-lp-line-strong bg-lp-line-strong lg:grid-cols-(--cols)"
    >
      {items.map((item, i) => {
        const text = format.format(item.value);
        const shown = printed === null || i < printed;

        return (
          <div
            key={item.label}
            className="flex flex-col bg-lp-paper p-4 max-lg:odd:last:col-span-2 md:p-5"
          >
            <dt className="text-[15px] leading-tight">{item.label}</dt>
            <dd
              className={cn(
                'mt-5 font-pixel text-[28px] leading-none text-lp-orange tabular-nums md:mt-8 md:text-5xl lg:text-[56px] xl:text-7xl',
                shown
                  ? "transition-[font-variation-settings] duration-500 ease-[steps(4,end)] [font-variation-settings:'ELSH'_0]"
                  : "[font-variation-settings:'ELSH'_20]",
              )}
            >
              <Roller
                key={printed === null ? 'rest' : 'roll'}
                value={shown ? text : text.replace(/\d/g, '0')}
                step={TICK / 2}
                stagger={TICK / 4}
              />
            </dd>
            {item.note && <dd className="mt-3 font-mono text-xs text-lp-ink-2">{item.note}</dd>}
          </div>
        );
      })}
    </dl>
  );
}
