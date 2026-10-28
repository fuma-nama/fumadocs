'use client';
import { cn } from '@/lib/cn';
import { useActive, useFigures, useStatus } from '../lib/status';

/** the bar itself never re-renders: the status and the figure links each subscribe */
export function StatusBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 h-(--lp-status-h) border-t border-lp-line-strong bg-lp-paper text-xs font-medium">
      <div className="mx-auto flex h-full max-w-(--lp-max) items-stretch">
        {/* decoration that follows the page, the figure links are the only part for assistive tech */}
        {/* a lit lamp, then the page's log line in the machine's type */}
        <p
          aria-hidden
          className="flex min-w-0 flex-1 items-center gap-2 ps-(--lp-gutter) pe-3 font-pixel font-normal"
        >
          <span className="size-2 shrink-0 rounded-full border border-lp-ink bg-lp-sun" />
          <Status />
        </p>
        <Figures />
      </div>
    </div>
  );
}

function Status() {
  const text = useStatus();
  // each line is a new element, so it prints in
  return (
    <span
      key={text}
      className="relative truncate after:absolute after:inset-0 after:translate-x-full after:bg-lp-paper motion-safe:after:animate-lp-print"
    >
      {text}
    </span>
  );
}

function Figures() {
  const figures = useFigures();
  const active = useActive();

  return (
    <nav aria-label="Figures" className="flex items-stretch pe-(--lp-gutter) max-md:hidden">
      {figures.map((figure) => (
        <a
          key={figure.id}
          href={`#${figure.id}`}
          aria-current={active === figure.id ? 'location' : undefined}
          className={cn(
            'flex items-center border-s border-lp-line-strong px-1.5 last:border-e hover:bg-lp-ink hover:text-lp-paper lg:px-2.5',
            active === figure.id && 'bg-lp-yellow text-lp-on-yellow',
          )}
        >
          {figure.label}
        </a>
      ))}
    </nav>
  );
}
