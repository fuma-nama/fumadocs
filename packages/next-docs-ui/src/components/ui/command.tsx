import { cn } from '@/utils/cn'
import type { DialogProps } from '@radix-ui/react-dialog'
import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import * as React from 'react'
import { Dialog, DialogContent } from './dialog'

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'nd-flex nd-h-full nd-w-full nd-flex-col nd-overflow-hidden nd-rounded-md nd-bg-popover nd-text-popover-foreground',
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

interface CommandDialogProps extends DialogProps {}

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="nd-overflow-hidden nd-p-0 nd-max-w-2xl">
        <Command shouldFilter={false}>{children}</Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="nd-flex nd-items-center nd-border-b nd-px-3">
    <Search className="nd-mr-2 nd-h-4 nd-w-4 nd-shrink-0 nd-text-muted-foreground" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'nd-flex nd-w-full nd-rounded-md nd-py-3 nd-text-sm nd-bg-transparent nd-outline-none disabled:nd-cursor-not-allowed disabled:nd-opacity-50 placeholder:nd-text-muted-foreground',
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      'nd-max-h-[400px] nd-text-muted-foreground nd-overflow-y-auto',
      className
    )}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="nd-py-12 nd-text-center nd-text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'nd-overflow-hidden nd-p-2 [&_[cmdk-group-heading]]:nd-px-3 [&_[cmdk-group-heading]]:nd-py-2 [&_[cmdk-group-heading]]:nd-text-xs [&_[cmdk-group-heading]]:nd-font-medium',
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('nd-h-px nd-bg-border', className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> & {
    nested?: boolean
  }
>(({ className, nested = false, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'nd-cursor-pointer nd-select-none nd-rounded-lg nd-text-sm aria-selected:nd-bg-accent aria-selected:nd-text-accent-foreground data-[disabled]:nd-pointer-events-none data-[disabled]:nd-opacity-50 [&_svg]:nd-h-5 [&_svg]:nd-w-5',
      className
    )}
    {...props}
  >
    <div
      className={cn(
        'nd-flex nd-gap-2 nd-items-center nd-px-3 nd-py-2.5',
        nested && 'nd-ml-5 nd-border-l-2'
      )}
    >
      {props.children}
    </div>
  </CommandPrimitive.Item>
))

CommandItem.displayName = CommandPrimitive.Item.displayName

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator
}
