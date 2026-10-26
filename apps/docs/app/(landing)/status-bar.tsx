'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { pad, useNow } from './lib/clock';
import { getStatus, setStatus, useStatus } from './lib/status';
import { Scramble } from './ui/text';
import { Waveform } from './waveform';

interface FigureEntry {
  id: string;
  label: string;
}

/** the bar itself never re-renders: the status, the figure links and the clock each subscribe */
export function StatusBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 h-(--lp-status-h) border-t border-lp-line-strong bg-lp-paper font-pixel text-[13px]">
      <div className="mx-auto flex h-full max-w-(--lp-max) items-stretch">
        {/* decoration that follows the page, the figure links are the only part for assistive tech */}
        <p
          aria-hidden
          className="flex min-w-0 flex-1 items-center gap-2 ps-(--lp-gutter) pe-3 md:border-e md:border-lp-line-strong lg:w-72 lg:flex-none xl:w-80"
        >
          <span className="text-lp-ink-2">status:</span>
          <Status />
        </p>
        <Figures />
        <Waveform className="mx-3 min-w-0 flex-1 self-center max-lg:hidden" />
        <Clock />
      </div>
    </div>
  );
}

function Status() {
  return <Scramble text={useStatus()} speed={18} className="truncate" />;
}

function Figures() {
  const [figures, setFigures] = useState<FigureEntry[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-figure]');
    const entries: FigureEntry[] = [];
    const visible = new Set<HTMLElement>();

    for (const section of sections) {
      entries.push({ id: section.id, label: section.getAttribute('aria-label') ?? section.id });
    }
    setFigures(entries);

    // the active figure is the one covering the middle of the viewport; its default status
    // replaces the line when the figure changes, so a figure can keep its own (`booting`)
    let current: HTMLElement | undefined;
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          const section = record.target as HTMLElement;
          if (record.isIntersecting) visible.add(section);
          else visible.delete(section);
        }
        const [section] = visible;
        setActive(section?.id ?? null);
        if (section === current) return;
        if (current !== undefined || getStatus() === 'ready')
          setStatus(section?.dataset.status ?? 'ready');
        current = section;
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Figures" className="flex items-stretch max-md:hidden">
      {figures.map((figure) => (
        <a
          key={figure.id}
          href={`#${figure.id}`}
          aria-current={active === figure.id ? 'location' : undefined}
          className={cn(
            'flex items-center border-e border-lp-line-strong px-1.5 hover:bg-lp-ink hover:text-lp-paper lg:px-2.5',
            active === figure.id && 'bg-lp-yellow text-[#121210]',
          )}
        >
          {figure.label}
        </a>
      ))}
    </nav>
  );
}

function Clock() {
  const now = useNow();
  return (
    <p
      aria-hidden
      className="flex items-center gap-3 border-s border-lp-line-strong px-3 tabular-nums max-md:pe-(--lp-gutter)"
    >
      {now ? (
        <>
          <span>
            {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
          </span>
          <span className="text-lp-ink-2 max-lg:hidden">
            {now.getFullYear()}/{pad(now.getMonth() + 1)}/{pad(now.getDate())}
          </span>
        </>
      ) : (
        ' '
      )}
    </p>
  );
}
