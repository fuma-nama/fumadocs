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
          'flex flex-row gap-2 rounded-lg p-3 border bg-card text-muted-foreground text-sm shadow-md my-6',
          className
        )}
        {...props}
      >
        {icon ??
          {
            info: <InfoIcon className="text-card fill-blue-500 w-5 h-5" />,
            warn: (
              <AlertTriangleIcon className="text-card fill-orange-500 w-5 h-5" />
            ),
            error: (
              <AlertOctagonIcon className="text-card fill-red-500 w-5 h-5" />
            )
          }[type]}
        <div className="flex-1 w-0">
          {title && (
            <div className="text-card-foreground font-medium mb-0.5">
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
