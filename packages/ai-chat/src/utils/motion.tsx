import type { CSSProperties, ReactNode } from 'react';
import { cn } from 'cn';

/** rises in after its earlier siblings */
export function stagger(base = 0): CSSProperties {
  return {
    animationDelay: `calc(${base}ms + (sibling-index() - 1) * 50ms)`,
    animationFillMode: 'backwards',
  };
}

export function IconSwap({
  swapped,
  from,
  to,
}: {
  swapped: boolean;
  from: ReactNode;
  to: ReactNode;
}) {
  const layer =
    'col-start-1 row-start-1 flex transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';
  const hidden = 'scale-50 opacity-0 blur-[2px]';

  return (
    <span className="inline-grid place-items-center">
      <span aria-hidden={swapped} className={cn(layer, swapped && hidden)}>
        {from}
      </span>
      <span aria-hidden={!swapped} className={cn(layer, !swapped && hidden)}>
        {to}
      </span>
    </span>
  );
}

const orbit = [1.6, 1.35, 1.15, 1, 0.85, 0.72, 0.6].map((r, i) => {
  const angle = (-i * 32 * Math.PI) / 180;
  return { cx: 8 + 5.5 * Math.sin(angle), cy: 8 - 5.5 * Math.cos(angle), r, opacity: 1 - i * 0.12 };
});

export function Spinner() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="size-4 shrink-0 text-fd-primary motion-safe:animate-spin motion-safe:[animation-duration:1.2s]"
    >
      {orbit.map((dot, i) => (
        <circle key={i} {...dot} fill="currentColor" />
      ))}
    </svg>
  );
}
