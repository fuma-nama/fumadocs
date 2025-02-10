import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Wrapper(
  props: HTMLAttributes<HTMLDivElement>,
): React.ReactElement {
  return (
    <div
      {...props}
      className={cn(
        'rounded-lg bg-black/20 p-4 border prose-no-margin',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
