import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { DITHER_MASKS } from '../lib/dither';

interface TitleBarProps {
  title?: ReactNode;
  /** extra content at the end of the title bar */
  actions?: ReactNode;
}

/**
 * A window's striped title bar, its title between two boxes. A window holds a file, a path or an
 * address, so the title is set as code; a title that names something sets itself in the machine's
 * pixel type.
 */
export function TitleBar({ title, actions }: TitleBarProps) {
  return (
    <div className="relative flex h-7 shrink-0 items-center gap-1.5 border-b border-lp-line-strong px-1.5">
      <div aria-hidden className="lp-pinstripe absolute inset-x-1.5 inset-y-0" />
      <span aria-hidden className="relative size-3.5 border border-lp-line-strong bg-lp-paper" />
      <span className="relative mx-auto truncate bg-lp-paper px-2 font-mono text-xs leading-4">
        {title}
      </span>
      {actions ?? (
        <span aria-hidden className="relative size-3.5 border border-lp-line-strong bg-lp-paper" />
      )}
    </div>
  );
}

interface WindowProps extends Omit<ComponentProps<'div'>, 'title'>, TitleBarProps {}

/** a window of the landing's desktop: hairline frame, striped title bar */
export function Window({ title, actions, children, className, ...props }: WindowProps) {
  return (
    <div
      {...props}
      className={cn('flex flex-col border border-lp-line-strong bg-lp-paper', className)}
    >
      <TitleBar title={title} actions={actions} />
      {children}
    </div>
  );
}

/** the dithered shadow under a window on a desk, 3px right and 4px down: put it first in an
 * `isolate` box round the window */
export function Shadow() {
  return (
    <span
      aria-hidden
      className="absolute inset-0 -z-10 translate-x-0.75 translate-y-1 bg-lp-ink-2"
      style={{ maskImage: DITHER_MASKS[6], maskSize: '4px 4px' }}
    />
  );
}
