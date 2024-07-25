import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
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
  type?: 'info' | 'warn' | 'error';
  icon?: ReactNode;
};

export const Callout = forwardRef<HTMLDivElement, CalloutProps>(
  ({ className, children, title, type = 'info', icon, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'my-6 flex flex-row gap-2 rounded-lg border bg-fd-card p-3 text-sm text-fd-muted-foreground shadow-md',
          className,
        )}
        {...props}
      >
        {icon ??
          {
            info: <Info className="size-5 fill-blue-500 text-fd-card" />,
            warn: (
              <AlertTriangle className="size-5 fill-orange-500 text-fd-card" />
            ),
            error: (
              <AlertOctagon className="size-5 fill-red-500 text-fd-card" />
            ),
          }[type]}
        <div className="w-0 flex-1">
          {title ? (
            <div className="mb-2 font-medium text-fd-card-foreground">
              {title}
            </div>
          ) : null}
          <div className="prose-no-margin">{children}</div>
        </div>
      </div>
    );
  },
);

Callout.displayName = 'Callout';
