'use client';
import type { ComponentProps, ReactNode } from 'react';
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
      // a hot reload can shift figures' props along the page: another id is another figure
      key={props.id}
      {...props}
      ref={registerFigure}
      data-figure=""
      data-status={status}
      className={cn('relative scroll-mt-(--lp-menu-h) border-t border-lp-line', className)}
    >
      <Mark className="-top-[5.5px] -left-[5.5px]" />
      <Mark className="-top-[5.5px] -right-[5.5px]" />
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
      className={cn('absolute z-10 size-[11px] text-lp-line-strong max-[1400px]:hidden', className)}
    >
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" />
    </svg>
  );
}

/** a run of a title's text, or a key term of it, set in the orange pixel type */
export type Run = string | { term: string };

/** a title's runs, its key terms in the orange pixel type */
export function Terms({ runs }: { runs: readonly Run[] }) {
  const out: ReactNode[] = [];
  for (const run of runs) {
    out.push(
      typeof run === 'string' ? (
        run
      ) : (
        <span
          key={run.term}
          className="font-pixel font-normal tracking-normal whitespace-nowrap text-lp-orange"
        >
          {run.term}
        </span>
      ),
    );
  }
  return out;
}

interface FigureHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** the opening of the title, set in the orange pixel type on its own line */
  lead?: ReactNode;
  /** a line break in its text breaks the title there */
  title: ReactNode;
  description?: ReactNode;
}

export function FigureHeader({ lead, title, description, className, ...props }: FigureHeaderProps) {
  return (
    <div {...props} className={cn('flex flex-col gap-4', className)}>
      <h2 className="text-[clamp(1.625rem,1rem+2vw,2.5rem)] leading-[1.1] font-medium tracking-[-0.028em] text-pretty whitespace-pre-line">
        {lead && <Lead>{lead}</Lead>} {title}
      </h2>
      {description && (
        <p className="max-w-[46ch] text-lg leading-relaxed text-pretty text-lp-ink-2">
          {description}
        </p>
      )}
    </div>
  );
}

/** the opening of a title in the orange pixel type of the sheet, sized from its heading */
export function Lead({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'mb-[0.33em] block font-pixel text-[0.8em] leading-[1.1] font-normal tracking-normal text-lp-orange',
        className,
      )}
    >
      {children}
    </span>
  );
}
