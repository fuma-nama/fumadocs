/** Generated with Shadcn UI */
import { cn } from '@/utils/cn'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import * as React from 'react'

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn('nd-overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="nd-h-full nd-w-full nd-rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Corner />
    <ScrollBar orientation="horizontal" />
    <ScrollBar orientation="vertical" />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Scrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.Scrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'nd-flex nd-select-none data-[state=hidden]:nd-animate-out data-[state=hidden]:nd-fade-out',
      orientation === 'vertical' && 'nd-h-full nd-w-1.5',
      orientation === 'horizontal' && 'nd-h-1.5 nd-flex-col',
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="nd-relative nd-flex-1 nd-rounded-full nd-bg-border" />
  </ScrollAreaPrimitive.Scrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.Scrollbar.displayName

export { ScrollArea }
