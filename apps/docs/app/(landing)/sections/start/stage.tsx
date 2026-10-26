'use client';
import type { ReactNode } from 'react';
import { later } from '../../lib/later';
import { createStart } from './engine';

function mount(pin: HTMLDivElement | null) {
  if (!pin) return;
  const find = (name: string) => pin.querySelector<HTMLElement>(`[data-${name}]`)!;
  return later(() =>
    createStart({
      pin,
      stage: find('stage'),
      canvas: pin.querySelector('canvas')!,
      slot: find('slot'),
      cta: find('cta'),
      readout: find('readout'),
    }),
  );
}

/** the pinned stage: a toon 3D terminal the camera pulls out of, with the call to action beside it */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div ref={mount} className="relative md:h-[230svh] md:motion-reduce:h-auto">
      <div
        data-stage
        className="relative overflow-hidden bg-lp-paper md:sticky md:top-(--lp-menu-h) md:h-[calc(100svh-var(--lp-menu-h)-var(--lp-status-h))] md:min-h-[540px]"
      >
        <canvas aria-hidden className="absolute inset-0 size-full" />
        <div className="relative grid h-full gap-10 px-(--lp-gutter) pt-8 pb-12 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-8 md:pt-[10svh] md:pb-[14svh]">
          <div data-slot aria-hidden className="aspect-[4/3] md:aspect-auto" />
          <div data-cta className="relative flex flex-col justify-center gap-8 @container">
            {children}
          </div>
        </div>
        <p
          data-readout
          aria-hidden
          className="absolute right-(--lp-gutter) bottom-4 flex gap-3 border border-lp-line-strong bg-lp-paper px-3 py-1 font-mono text-xs text-lp-ink-2 max-md:hidden"
        >
          <span>
            yaw <span data-value className="text-lp-orange" />
          </span>
          <span>
            dist <span data-value className="text-lp-orange" />
          </span>
        </p>
      </div>
    </div>
  );
}
