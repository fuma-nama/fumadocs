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
          'bg-card text-muted-foreground my-6 flex flex-row gap-2 rounded-lg border p-3 text-sm shadow-md',
          className
        )}
        {...props}
      >
        {icon ??
          {
            info: <InfoIcon className="text-card h-5 w-5 fill-blue-500" />,
            warn: (
              <AlertTriangleIcon className="text-card h-5 w-5 fill-orange-500" />
            ),
            error: (
              <AlertOctagonIcon className="text-card h-5 w-5 fill-red-500" />
            )
          }[type]}
        <div className="w-0 flex-1">
          {title && (
            <div className="text-card-foreground mb-0.5 font-medium">
              {title}
            </div>
          )}
          <div className="prose-no-margin">{children}</div>
        </div>
      </div>
    )
  }
)

Callout.displayName = 'Callout'
