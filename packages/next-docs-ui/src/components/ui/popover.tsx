/** Generated with Shadcn UI */
import { cn } from '@/utils/cn'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as React from 'react'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'nd-z-50 nd-max-w-[90vw] nd-rounded-md nd-border nd-bg-popover nd-p-4 nd-text-popover-foreground nd-shadow-md nd-outline-none data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out data-[state=closed]:nd-fade-out data-[state=open]:nd-fade-in data-[state=closed]:nd-zoom-out-95 data-[state=open]:nd-zoom-in-95 data-[side=bottom]:nd-slide-in-from-top-2 data-[side=left]:nd-slide-in-from-right-2 data-[side=right]:nd-slide-in-from-left-2 data-[side=top]:nd-slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
