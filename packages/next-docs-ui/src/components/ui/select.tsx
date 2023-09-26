/** Generated with Shadcn UI */
import { cn } from '@/utils/cn'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import * as React from 'react'

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'nd-flex nd-h-10 nd-w-full nd-items-center nd-justify-between nd-rounded-md nd-border nd-border-input nd-px-3 nd-py-2 nd-text-sm nd-ring-offset-background focus:nd-outline-none focus:nd-ring-2 focus:nd-ring-ring focus:nd-ring-offset-2 disabled:nd-cursor-not-allowed disabled:nd-opacity-50 data-[placeholder]:nd-text-muted-foreground',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="nd-h-4 nd-w-4 nd-opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'nd-relative nd-z-50 nd-min-w-[8rem] nd-overflow-hidden nd-rounded-md nd-border nd-bg-popover nd-text-popover-foreground nd-shadow-md data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out data-[state=closed]:nd-fade-out data-[state=open]:nd-fade-in data-[state=closed]:nd-zoom-out-95 data-[state=open]:nd-zoom-in-95 data-[side=bottom]:nd-slide-in-from-top-2 data-[side=left]:nd-slide-in-from-right-2 data-[side=right]:nd-slide-in-from-left-2 data-[side=top]:nd-slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:nd-translate-y-1 data-[side=left]:-nd-translate-x-1 data-[side=right]:nd-translate-x-1 data-[side=top]:-nd-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'nd-p-1',
          position === 'popper' &&
            'nd-h-[var(--radix-select-trigger-height)] nd-w-full nd-min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'nd-py-1.5 nd-pl-8 nd-pr-2 nd-text-sm nd-font-semibold',
      className
    )}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'nd-relative nd-flex nd-w-full nd-select-none nd-items-center nd-rounded-sm nd-py-1.5 nd-pl-8 nd-pr-2 nd-text-sm nd-outline-none focus:nd-bg-accent focus:nd-text-accent-foreground data-[disabled]:nd-pointer-events-none data-[disabled]:nd-opacity-50',
      className
    )}
    {...props}
  >
    <span className="nd-absolute nd-left-2 nd-flex nd-h-3.5 nd-w-3.5 nd-items-center nd-justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="nd-h-4 nd-w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-nd-mx-1 nd-my-1 nd-h-px nd-bg-muted', className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator
}
