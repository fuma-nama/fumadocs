import { cn } from '@/utils/cn'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { forwardRef } from 'react'

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      ref={ref}
      className={cn(
        'nd-overflow-hidden data-[state=closed]:nd-animate-collapsible-up data-[state=open]:nd-animate-collapsible-down',
        className
      )}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.CollapsibleContent>
  )
})

CollapsibleContent.displayName =
  CollapsiblePrimitive.CollapsibleContent.displayName

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
