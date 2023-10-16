import { cn } from '@/utils/cn'
import { AlertOctagonIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

type CalloutProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'title' | 'type' | 'icon'
> & {
  title?: ReactNode
  type?: 'info' | 'warn' | 'error'
  icon?: ReactNode
}

export const Callout = forwardRef<HTMLDivElement, CalloutProps>(
  ({ className, children, title, type = 'info', icon, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'nd-flex nd-flex-row nd-gap-2 nd-rounded-lg nd-p-3 nd-border nd-bg-card nd-text-muted-foreground nd-text-sm nd-shadow-md',
          className
        )}
        {...props}
      >
        {icon ??
          {
            info: (
              <InfoIcon className="nd-text-card nd-fill-blue-500 nd-w-5 nd-h-5" />
            ),
            warn: (
              <AlertTriangleIcon className="nd-text-card nd-fill-orange-500 nd-w-5 nd-h-5" />
            ),
            error: (
              <AlertOctagonIcon className="nd-text-card nd-fill-red-500 nd-w-5 nd-h-5" />
            )
          }[type]}
        <div className="nd-flex-1 nd-w-0">
          {title && (
            <div className="nd-text-card-foreground nd-font-medium nd-mb-0.5">
              {title}
            </div>
          )}
          <div className="[&_:first-child]:nd-mt-0 [&_:last-child]:nd-mb-0">
            {children}
          </div>
        </div>
      </div>
    )
  }
)

Callout.displayName = 'Callout'
