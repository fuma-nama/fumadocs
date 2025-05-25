import { cx } from '@/lib/cvb.config';
import type { HTMLAttributes } from 'react';

export function Wrapper(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx(
        'rounded-lg bg-radial-[at_bottom] from-blue-500/20 p-4 border border-fd-primary/10 prose-no-margin dark:bg-black/20',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
