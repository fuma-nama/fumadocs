/** Generated with Shadcn UI */
import { cn } from '@/utils/cn'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { CheckIcon, ChevronRightIcon, SquareDotIcon } from 'lucide-react'
import * as React from 'react'

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'nd-flex nd-select-none nd-items-center nd-rounded-sm nd-px-2 nd-py-1.5 nd-text-sm nd-outline-none focus:nd-bg-accent data-[state=open]:nd-bg-accent',
      inset && 'nd-pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon className="nd-ml-auto nd-h-4 nd-w-4" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'nd-z-50 nd-min-w-[8rem] nd-overflow-hidden nd-rounded-md nd-border nd-bg-popover nd-p-1 nd-text-popover-foreground nd-shadow-lg data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out data-[state=closed]:nd-fade-out-0 data-[state=open]:nd-fade-in-0 data-[state=closed]:nd-zoom-out-95 data-[state=open]:nd-zoom-in-95 data-[side=bottom]:nd-slide-in-from-top-2 data-[side=left]:nd-slide-in-from-right-2 data-[side=right]:nd-slide-in-from-left-2 data-[side=top]:nd-slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'nd-z-50 nd-min-w-[8rem] nd-overflow-hidden nd-rounded-md nd-border nd-bg-popover nd-p-1 nd-text-popover-foreground nd-shadow-md',
        'data-[state=open]:nd-animate-in data-[state=closed]:nd-animate-out data-[state=closed]:nd-fade-out-0 data-[state=open]:nd-fade-in-0 data-[state=closed]:nd-zoom-out-95 data-[state=open]:nd-zoom-in-95 data-[side=bottom]:nd-slide-in-from-top-2 data-[side=left]:nd-slide-in-from-right-2 data-[side=right]:nd-slide-in-from-left-2 data-[side=top]:nd-slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'nd-relative nd-flex nd-cursor-default nd-select-none nd-items-center nd-rounded-sm nd-px-2 nd-py-1.5 nd-text-sm nd-outline-none nd-transition-colors focus:nd-bg-accent focus:nd-text-accent-foreground data-[disabled]:nd-pointer-events-none data-[disabled]:nd-opacity-50',
      inset && 'nd-pl-8',
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'nd-relative nd-flex nd-select-none nd-items-center nd-rounded-sm nd-py-1.5 nd-pl-8 nd-pr-2 nd-text-sm nd-outline-none nd-transition-colors focus:nd-bg-accent focus:nd-text-accent-foreground data-[disabled]:nd-pointer-events-none data-[disabled]:nd-opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="nd-absolute nd-left-2 nd-flex nd-h-3.5 nd-w-3.5 nd-items-center nd-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <CheckIcon className="nd-h-4 nd-w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'nd-relative nd-flex nd-select-none nd-items-center nd-rounded-sm nd-py-1.5 nd-pl-8 nd-pr-2 nd-text-sm nd-outline-none nd-transition-colors focus:nd-bg-accent focus:nd-text-accent-foreground data-[disabled]:nd-pointer-events-none data-[disabled]:nd-opacity-50',
      className
    )}
    {...props}
  >
    <span className="nd-absolute nd-left-2 nd-flex nd-h-3.5 nd-w-3.5 nd-items-center nd-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <SquareDotIcon className="nd-h-4 nd-w-4 nd-fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'nd-px-2 nd-py-1.5 nd-text-sm nd-font-semibold',
      inset && 'nd-pl-8',
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-nd-mx-1 nd-my-1 nd-h-px nd-bg-muted', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        'nd-ml-auto nd-text-xs nd-tracking-widest nd-opacity-60',
        className
      )}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup
}
