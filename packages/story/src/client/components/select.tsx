import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';
import { cn } from '@/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const triggerVariants = cva(
  'flex items-center w-full rounded-md gap-2 text-start text-sm focus:outline-none focus:ring focus:ring-fd-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border p-2 text-fd-secondary-foreground bg-fd-secondary hover:bg-fd-accent hover:text-fd-accent-foreground',
        ghost: 'px-1.5 py-1 hover:bg-fd-accent hover:text-fd-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function SelectTrigger({
  className,
  variant,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & VariantProps<typeof triggerVariants>) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(triggerVariants({ variant }), className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="ms-auto text-fd-muted-foreground shrink-0">
        <ChevronDown className="size-3.5" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectScrollUpButton({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      ref={ref}
      className={cn('flex items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUp className="size-4" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      ref={ref}
      className={cn('flex items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDown className="size-4" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

function SelectContent({
  className,
  children,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  ref,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup> &
  Pick<React.ComponentProps<typeof SelectPrimitive.Positioner>, 'align' | 'side' | 'sideOffset'>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="z-50"
      >
        <SelectPrimitive.Popup
          ref={ref}
          className={cn(
            'z-50 min-w-(--anchor-width) overflow-hidden rounded-lg border bg-fd-popover text-fd-popover-foreground shadow-md',
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="p-1">{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return (
    <SelectPrimitive.GroupLabel
      ref={ref}
      className={cn('py-1.5 pe-2 ps-6 text-sm font-semibold', className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'flex select-none flex-row items-center rounded-md gap-2 py-1.5 px-2 text-sm outline-none data-[highlighted]:bg-fd-accent data-[highlighted]:text-fd-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ms-auto">
        <Check className="size-3.5 text-fd-primary" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator className={cn('my-1 h-px bg-fd-muted', className)} {...props} />
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
