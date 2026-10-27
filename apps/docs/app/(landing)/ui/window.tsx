import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TitleBarProps {
  title?: ReactNode;
  /** extra content at the end of the title bar */
  actions?: ReactNode;
}

/** a window's striped title bar, its title between two boxes */
export function TitleBar({ title, actions }: TitleBarProps) {
  return (
    <div className="relative flex h-7 shrink-0 items-center gap-1.5 border-b border-lp-line-strong px-1.5">
      <div aria-hidden className="lp-pinstripe absolute inset-x-1.5 inset-y-0" />
      <span aria-hidden className="relative size-3.5 border border-lp-line-strong bg-lp-paper" />
      <span className="relative mx-auto truncate bg-lp-paper px-2 font-mono text-xs leading-[17px]">
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
