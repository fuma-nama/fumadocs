'use client';
import { type ReactNode, useCallback, useState } from 'react';
import { nearby } from '../../lib/script';
import { Roller } from '../../ui/text';
import { createProjects, TIMING } from './engine';

export interface Reading {
  label: string;
  value: number;
  /** where the reading comes from: a repository or a package */
  source: string;
}

const format = new Intl.NumberFormat('en-US');

/**
 * The machine that opens the section, a flat console: its case carries the section's title, its
 * screen the proof, a lamp on its chin. The case reaches past the content column by its padding, so
 * the title and the screen keep to the gutter every section's title sits on; below the sheet's width
 * that is the gutter, edge to edge. The screen reads its meters side by side from 1024px, each its
 * name over where the reading comes from over the number, and a row each below: the number at the
 * row's end, under the name on phones. `printed` is how many have rolled in from zeros, `null` at
 * rest.
 */
function Machine({
  title,
  readings,
  printed,
}: {
  title: ReactNode;
  readings: Reading[];
  printed: number | null;
}) {
  const rows: ReactNode[] = [];
  for (let i = 0; i < readings.length; i++) {
    const reading = readings[i];
    const text = format.format(reading.value);
    rows.push(
      <div
        key={reading.label}
        className="flex flex-col gap-2 border-t border-lp-paper/15 px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-2.5 lg:flex-col lg:items-start lg:justify-start lg:gap-2 lg:border-s lg:border-t-0 lg:px-5 lg:py-4 lg:first:border-s-0 dark:border-lp-ink/15"
      >
        <dt className="flex flex-col">
          <span className="font-pixel text-[13.16px] leading-4 text-lp-paper/70 antialiased dark:text-lp-ink/70">
            {reading.label}
          </span>
          <span className="font-mono text-xs leading-4 text-lp-paper/50 dark:text-lp-ink/50">
            {reading.source}
          </span>
        </dt>
        <dd className="font-pixel text-[26.32px] leading-7 text-lp-sun antialiased sm:text-[52.64px] sm:leading-14">
          <Roller
            key={printed === null ? 'rest' : 'roll'}
            value={text}
            from={printed === null ? undefined : text.replace(/\d/g, '0')}
            play={printed !== null && i < printed}
            step={TIMING.step}
            stagger={TIMING.stagger}
            cell="w-4.5 text-center sm:w-9"
          />
        </dd>
      </div>,
    );
  }

  return (
    <div
      data-machine
      className="-mx-(--case) -mt-(--case) flex flex-col [--case:16px] sheet:[--case:24px]"
    >
      {/* its border inside its reach */}
      <div className="border border-lp-line-strong bg-lp-paper-2 px-[calc(var(--case)_-_1px)] pt-[calc(var(--case)_-_1px)]">
        {title}
        <div className="mt-6 border border-lp-ink bg-lp-ink dark:border-lp-line-strong dark:bg-lp-paper">
          <div data-screen className="relative">
            <dl className="flex flex-col lg:grid lg:grid-cols-3">{rows}</dl>
            <span
              data-beam
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-lp-sun opacity-0"
            />
          </div>
        </div>
        <div className="flex h-6 items-center justify-end">
          <span data-lamp aria-hidden className="size-1.5 bg-lp-sun data-[state=off]:bg-lp-line" />
        </div>
      </div>
      <span aria-hidden className="mx-6 h-px bg-lp-line" />
    </div>
  );
}

interface StageProps {
  /** the section's title, on the machine's case */
  title: ReactNode;
  readings: Reading[];
  /** the figure's line, which it reports again once the desk is all there */
  status: string;
  /** the windows on the desk, in the order they land: the picks, Vercel's SDKs, then the rest */
  picks: ReactNode;
  vercel: ReactNode;
  rest: ReactNode;
}

/**
 * The machine with the title on it, then the desk. From 1024px the desk is a drift of windows from
 * the upper left toward the right, the way to the showcase at the lower left; below it the picks are
 * a cascading pile, then Vercel's SDKs and the way to the rest, side by side from 640px.
 */
export function Stage({ title, readings, status, picks, vercel, rest }: StageProps) {
  const [printed, setPrinted] = useState<number | null>(null);
  const mount = useCallback(
    (stage: HTMLDivElement | null) => {
      if (!stage) return;
      const stop = nearby(stage, () => createProjects(stage, status, setPrinted));
      return () => {
        stop();
        setPrinted(null);
      };
    },
    [status],
  );

  return (
    <div ref={mount} className="flex flex-col">
      <Machine title={title} readings={readings} printed={printed} />
      <div
        data-desk
        className="relative z-10 mt-10 flex flex-col gap-8 sm:grid sm:grid-cols-2 sm:items-start md:mt-12 lg:block"
      >
        <div className="relative w-full max-w-155 sm:col-span-2 lg:contents">
          <span aria-hidden className="block pt-[calc(167.6%_+_34px)] lg:hidden" />
          {picks}
        </div>
        {vercel}
        <div className="relative h-38 w-70 lg:contents">{rest}</div>
        {/* as tall as the lowest window, ArkType's, and its shadow */}
        <span aria-hidden className="hidden pt-[calc(44.6%_+_33px)] lg:block" />
      </div>
    </div>
  );
}
