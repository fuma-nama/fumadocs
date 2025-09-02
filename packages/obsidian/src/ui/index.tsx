import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
} from 'fumadocs-ui/internal/icons';
import { ComponentProps } from 'react';
import { cn } from 'fumadocs-ui/utils/cn';

interface CalloutProps extends ComponentProps<'div'> {
  /**
   * @defaultValue info
   */
  type?: 'info' | 'warn' | 'error' | 'success' | 'warning';
}

const iconClass = 'size-5 -me-0.5 fill-(--callout-color) text-fd-card';

export function ObsidianCallout({
  className,
  type = 'info',
  ...props
}: CalloutProps) {
  if (type === 'warn') type = 'warning';
  if ((type as unknown) === 'tip') type = 'info';

  return (
    <div
      className={cn(
        'flex gap-2 my-4 rounded-xl border bg-fd-card p-3 ps-1 text-sm text-fd-card-foreground shadow-md',
        className,
      )}
      {...props}
      style={
        {
          '--callout-color': `var(--color-fd-${type}, var(--color-fd-muted))`,
          ...props.style,
        } as object
      }
    >
      <div role="none" className="w-0.5 bg-(--callout-color)/50 rounded-sm" />
      {
        {
          info: <Info className={iconClass} />,
          warning: <TriangleAlert className={iconClass} />,
          error: <CircleX className={iconClass} />,
          success: <CircleCheck className={iconClass} />,
        }[type]
      }
      <div className="flex flex-col gap-2 min-w-0 flex-1">{props.children}</div>
    </div>
  );
}

export function ObsidianCalloutTitle(props: ComponentProps<'p'>) {
  return (
    <div
      {...props}
      className={cn('font-medium prose-no-margin', props.className)}
    >
      {props.children}
    </div>
  );
}

export function ObsidianCalloutBody(props: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'text-fd-muted-foreground prose-no-margin empty:hidden',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
