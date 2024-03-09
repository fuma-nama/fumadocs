import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';
import { DialogClose } from './dialog';

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn('flex max-h-[80vh] flex-col', className)}
    shouldFilter={false}
    loop
    {...props}
  />
));

Command.displayName = CommandPrimitive.displayName;

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center gap-2 px-3">
    <Search className="size-4 shrink-0 text-muted-foreground" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'w-full bg-transparent py-3 text-base placeholder:text-muted-foreground focus-visible:outline-none',
        className,
      )}
      {...props}
    />
    <DialogClose
      className={cn(
        buttonVariants({
          color: 'outline',
          className: 'text-xs p-1.5',
        }),
      )}
    >
      Esc
    </DialogClose>
  </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[460px] overflow-y-auto border-t p-2', className)}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-12 text-center text-sm"
    {...props}
  />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, heading, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    heading={
      heading ? (
        <div className="px-3 py-2 text-xs font-medium">{heading}</div>
      ) : undefined
    }
    className={cn('overflow-hidden', className)}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('h-px bg-border', className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> & {
    icon: React.ReactNode;
    nested?: boolean;
  }
>(({ className, icon, nested = false, children, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'select-none rounded-lg px-2 text-sm aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-selected:bg-accent aria-selected:text-accent-foreground',
      className,
    )}
    {...props}
  >
    <div
      className={cn(
        'flex min-h-10 flex-row items-center gap-3',
        nested && 'ml-2 gap-2 border-l pl-4',
      )}
    >
      <div className="text-muted-foreground [&_svg]:size-4">{icon}</div>
      <p className="w-0 flex-1 truncate">{children}</p>
    </div>
  </CommandPrimitive.Item>
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
};
