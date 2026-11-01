'use client';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { registerFigure } from '../lib/status';

interface FigureProps extends ComponentProps<'section'> {
  id: string;
  /** default status bar line while this figure is on screen */
  status?: string;
}

/** a sheet of the drawing set: one section with its top seam and registration marks */
export function Figure({ status, className, children, ...props }: FigureProps) {
  return (
    <section
      {...props}
      ref={registerFigure}
      data-figure=""
      data-status={status}
      className={cn('relative scroll-mt-(--lp-menu-h) border-t border-lp-line', className)}
    >
      <Mark className="left-0 -translate-x-1/2" />
      <Mark className="right-0 translate-x-1/2" />
      {children}
    </section>
  );
}

function Mark({ className }: { className: string }) {
  return (
    <svg
      aria-hidden
      data-mark=""
      viewBox="0 0 11 11"
      className={cn(
        'absolute top-0 z-10 size-2.75 -translate-y-1/2 text-lp-line-strong max-sheet:hidden',
        className,
      )}
    >
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" />
    </svg>
  );
}
