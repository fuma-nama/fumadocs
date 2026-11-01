import type { ComponentProps, ReactNode } from 'react';
import { asMarkdown } from 'fumadocs-core/server';
import { cn } from '@/lib/cn';
import { baseUrl } from '@/lib/metadata';
import { plain, type Run } from '../content';
import { Shadow } from './window';

/** a page's path as the absolute URL the Markdown links to */
export function url(path: string): string {
  return new URL(path, baseUrl).href;
}

/** a list in a sentence, its items between commas */
export function commas<T>(items: readonly T[], item: (value: T) => ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  for (const value of items) {
    if (out.length > 0) out.push(', ');
    out.push(item(value));
  }
  return out;
}

/**
 * A status plate of the status bar's machine set over a title: a lamp lit in a square cell, the line
 * in the next, one hairline between, over the dithered shadow of the CLI's bubble; a line of the
 * marks' type tall, as the bubble is.
 */
export function Status({ children }: { children: ReactNode }) {
  if (asMarkdown()) return children;

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
  if (asMarkdown()) return plain(runs);

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
  // the same heading in Markdown
  asMarkdown();

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
