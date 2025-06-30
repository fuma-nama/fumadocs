import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

type CalloutProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'title' | 'type' | 'icon'
> & {
  title?: ReactNode;
  /**
   * @defaultValue info
   */
  type?: 'info' | 'warn' | 'error' | 'success' | 'warning';

  /**
   * Force an icon
   */
  icon?: ReactNode;
};

export const Callout = forwardRef<HTMLDivElement, CalloutProps>(
  ({ className, children, title, type = 'info', icon, ...props }, ref) => {
    if (type === 'warn') type = 'warning';
    const DefaultIcon = {
      info: Info,
      warning: TriangleAlert,
      error: CircleX,
      success: CircleCheck,
    }[type];

    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-2 my-4 rounded-xl border bg-fd-card p-3 ps-1 text-sm text-fd-card-foreground shadow-md',
          className,
        )}
        {...props}
        style={
          {
            '--callout-color': `var(--color-fd-${type})`,
            ...props.style,
          } as object
        }
      >
        <div role="none" className="w-1 bg-(--callout-color)/50 rounded-sm" />
        {icon ?? (
          <DefaultIcon className="size-5 -me-0.5 fill-(--callout-color) text-fd-card" />
        )}
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          {title ? <p className="font-medium !my-0">{title}</p> : null}
          <div className="text-fd-muted-foreground prose-no-margin empty:hidden">
            {children}
          </div>
        </div>
      </div>
    );
  },
);

Callout.displayName = 'Callout';
