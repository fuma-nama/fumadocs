'use client';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import { useActive, useFigures, useStatus } from '../lib/status';
import { Scramble } from './text';
import { Waveform } from './waveform';

/** the bar itself never re-renders: the status, the figure links and the clock each subscribe */
export function StatusBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 h-(--lp-status-h) border-t border-lp-line-strong bg-lp-paper font-mono text-xs">
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
  const figures = useFigures();
  const active = useActive();

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

/** the time in whole seconds, 0 until the clock subscribes */
let now = 0;

function subscribeClock(onTick: () => void) {
  const tick = () => {
    now = Math.floor(Date.now() / 1000) * 1000;
    onTick();
  };
  tick();
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function Clock() {
  const time = useSyncExternalStore(
    subscribeClock,
    () => now,
    () => 0,
  );
  const date = new Date(time);
  return (
    <p
      aria-hidden
      className="flex items-center gap-3 border-s border-lp-line-strong px-3 tabular-nums max-md:pe-(--lp-gutter)"
    >
      {time > 0 ? (
        <>
          <span>
            {pad(date.getHours())}:{pad(date.getMinutes())}:{pad(date.getSeconds())}
          </span>
          <span className="text-lp-ink-2 max-xl:hidden">
            {date.getFullYear()}/{pad(date.getMonth() + 1)}/{pad(date.getDate())}
          </span>
        </>
      ) : (
        ' '
      )}
    </p>
  );
}
