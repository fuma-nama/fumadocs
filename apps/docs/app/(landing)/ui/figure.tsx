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

/**
 * A lead with a proofreader's edit: `was` struck through before `is`, the correction an update
 * makes. The struck words are drawing, so the line still reads as `text`.
 */
export function Corrected({ text, was, is }: { text: string; was: string; is: string }) {
  const at = text.indexOf(is);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <s
        aria-hidden
        className="relative text-lp-ink-2 no-underline after:absolute after:inset-x-[-0.06em] after:top-[56%] after:h-[max(1.5px,0.045em)] after:-rotate-3 after:bg-lp-ink"
      >
        {was}
      </s>{' '}
      {text.slice(at)}
    </>
  );
}

/** a run of a title's text, or a key term of it */
export type Run = string | { term: string };

/**
 * A title with key terms, set as a statement in one family: light, its terms a step up in medium
 * and in orange, so each is the strongest word on its line.
 */
export function Terms({ runs }: { runs: readonly Run[] }) {
  const out: ReactNode[] = [];
  for (const run of runs) {
    out.push(
      typeof run === 'string' ? (
        run
      ) : (
        <span key={run.term} className="font-medium whitespace-nowrap text-lp-orange">
          {run.term}
        </span>
      ),
    );
  }
  return <span className="font-light">{out}</span>;
}

interface FigureHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** the opening of the title, in the orange voice on its own line */
  lead?: ReactNode;
  /** a line break in its text breaks the title there */
  title: ReactNode;
  description?: ReactNode;
}

export function FigureHeader({ lead, title, description, className, ...props }: FigureHeaderProps) {
  return (
    <div {...props} className={cn('flex flex-col gap-4', className)}>
      <h2 className="text-[clamp(1.625rem,1rem+2vw,2.5rem)] leading-[1.2] font-medium tracking-tight text-pretty whitespace-pre-line md:leading-[1.1]">
        {lead && <Lead>{lead}</Lead>} {title}
      </h2>
      {description && (
        <p className="max-w-[46ch] text-lg leading-[1.45] text-pretty text-lp-ink-2">
          {description}
        </p>
      )}
    </div>
  );
}

/** the opening of a title, in the orange voice on its own line, its first stem on the title's */
export function Lead({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn('lp-voice lp-lead block text-lp-orange', className)}>{children}</span>;
}
