import type { LucideIcon } from 'lucide-react';
import { TerminalIcon } from 'lucide-react';
import { type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export function IconContainer({
  icon: Icon,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  icon?: LucideIcon;
}): React.ReactElement {
  return (
    <div
      {...props}
      className={cn(
        'rounded-md border bg-gradient-to-b from-muted to-secondary p-0.5 shadow-md [a[data-active=true]_&]:from-primary/60 [a[data-active=true]_&]:to-primary [a[data-active=true]_&]:text-primary-foreground',
        props.className,
      )}
    >
      {Icon ? <Icon /> : <TerminalIcon />}
    </div>
  );
}
