'use client';
import { cn } from '@/lib/cn';
import { reduce, setText } from '../lib/script';
import { onStatus, useActive, useFigures } from '../lib/status';

/** the bar itself never re-renders: the status and the figure links each subscribe */
export function StatusBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 h-(--lp-status-h) border-t border-lp-line-strong bg-lp-paper text-xs font-medium">
      <div className="mx-auto flex h-full max-w-(--lp-max) items-stretch">
        {/* decoration that follows the page, the figure links are the only part for assistive tech */}
        {/* a lit lamp, then the page's log line in the machine's type */}
        <p
          aria-hidden
          className="flex min-w-0 flex-1 items-center gap-2 ps-(--lp-gutter) pe-3 font-pixel text-[13.16px] leading-4 font-normal tabular-nums antialiased"
        >
          <span className="size-2 shrink-0 rounded-full border border-lp-ink bg-lp-sun" />
          <Status />
        </p>
        <Figures />
      </div>
    </div>
  );
}

/**
 * each line prints in: written into the one text node, the paper over it stepping off to the right.
 * A node put in instead would have the page match its layouts' `:has()` rules again.
 */
function print(el: HTMLSpanElement) {
  return onStatus((text) => {
    if (el.textContent === text) return;
    setText(el, text);
    if (reduce()) return;
    el.animate(
      { translate: ['0', '100%'] },
      { duration: 300, easing: 'steps(12)', pseudoElement: '::after' },
    );
  });
}

function Status() {
  return (
    <span
      ref={print}
      className="relative truncate after:absolute after:inset-0 after:translate-x-full after:bg-lp-paper motion-safe:after:animate-lp-print"
    >
      ready
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
