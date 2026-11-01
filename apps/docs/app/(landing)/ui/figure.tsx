'use client';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Run } from '../content';
import { registerFigure } from '../lib/status';
import { Shadow } from './window';

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

/**
 * A status plate of the status bar's machine set over a title: a lamp lit in a square cell, the line
 * in the next, one hairline between, over the dithered shadow of the CLI's bubble; a line of the
 * marks' type tall, as the bubble is.
 */
export function Status({ children }: { children: ReactNode }) {
  return (
    // as much air under it as the CLI bubble's tail leaves its title
    <span className="relative isolate mb-[0.5em] flex h-lh w-fit font-pixel text-mark font-normal tracking-normal text-lp-ink">
      <Shadow />
      <span
        aria-hidden
        className="relative flex aspect-square h-full items-center justify-center border border-lp-ink bg-lp-paper"
      >
        <span className="size-[0.55em] rounded-full border border-lp-ink bg-lp-sun" />
      </span>
      {/* the cap height trimmed, so the line sits optically centred in its cell */}
      <span className="relative flex items-center border border-s-0 border-lp-ink bg-lp-paper px-[0.75em]">
        <span className="[text-box:trim-both_cap_alphabetic]">{children}</span>
      </span>
    </span>
  );
}

/** a title's runs in the light voice it sits in, its key terms a step up in medium and in orange,
 * a line break where a run sets one */
export function Terms({ runs }: { runs: readonly Run[] }) {
  const out: ReactNode[] = [];
  for (const run of runs) {
    if (typeof run !== 'string') {
      out.push(
        <span key={run.term} className="font-medium whitespace-nowrap text-lp-orange">
          {run.term}
        </span>,
      );
      continue;
    }
    const lines = run.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) out.push(<br key={out.length} />);
      out.push(lines[i]);
    }
  }
  return out;
}

interface FigureHeaderProps extends Omit<ComponentProps<'h2'>, 'title' | 'children'> {
  /** set over the title: the CLI's question bubble, Automate's status plate */
  lead?: ReactNode;
  /** one sentence */
  title: readonly Run[];
}

/**
 * A figure's title: one sentence in the light voice, balanced within the titles' measure; the
 * measure counts the text alone, whatever padding the figure gives the heading.
 */
export function FigureHeader({ lead, title, className, ...props }: FigureHeaderProps) {
  return (
    <h2
      {...props}
      className={cn(
        'box-content max-w-title text-[clamp(1.625rem,1rem+2vw,2.5rem)] leading-tight font-light tracking-tight text-balance',
        className,
      )}
    >
      {lead} <Terms runs={title} />
    </h2>
  );
}
