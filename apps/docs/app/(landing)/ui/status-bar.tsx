'use client';
import { cn } from '@/lib/cn';
import { useActive, useFigures, useStatus } from '../lib/status';
import { Scramble } from './text';

/** the bar itself never re-renders: the status and the figure links each subscribe */
export function StatusBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 h-(--lp-status-h) border-t border-lp-line-strong bg-lp-paper text-xs font-medium">
      <div className="mx-auto flex h-full max-w-(--lp-max) items-stretch">
        {/* decoration that follows the page, the figure links are the only part for assistive tech */}
        <p aria-hidden className="flex min-w-0 flex-1 items-center gap-2 ps-(--lp-gutter) pe-3">
          <span className="text-lp-ink-2">status:</span>
          <Status />
        </p>
        <Figures />
      </div>
    </div>
  );
}

function Status() {
  return <Scramble text={useStatus()} speed={18} className="truncate" />;
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
            active === figure.id && 'bg-lp-yellow text-[#121210]',
          )}
        >
          {figure.label}
        </a>
      ))}
    </nav>
  );
}
