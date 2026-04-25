'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { Select as Primitive } from '@base-ui/react/select';
import { cva } from 'class-variance-authority';
import { cnState } from '@/lib/cn';
import { CheckIcon, ChevronDown } from 'lucide-react';

export const Select = Primitive.Root;
export const SelectValue = Primitive.Value;
export const SelectIcon = Primitive.Icon;
export const SelectList = Primitive.List;
export const SelectItemText = Primitive.ItemText;

const selectTriggerStyles = cva(
  'flex w-full text-start items-center justify-between rounded-md border border-fe-border bg-fe-input px-3 py-2 text-sm text-fe-foreground outline-none transition-colors hover:border-fe-ring focus-visible:border-fe-ring',
);

const selectPopupStyles = cva(
  'z-50 min-w-(--anchor-width) rounded-md border border-fe-border bg-fe-popover p-1 text-fe-popover-foreground shadow-2xl',
);

const selectItemStyles = cva(
  'flex cursor-default select-none items-center rounded px-2 py-1.5 text-sm text-fe-muted-foreground outline-none data-highlighted:bg-fe-accent data-highlighted:text-fe-accent-foreground data-selected:text-fe-foreground',
);

type SelectTriggerProps = ComponentPropsWithoutRef<typeof Primitive.Trigger>;
type SelectPopupProps = ComponentPropsWithoutRef<typeof Primitive.Popup>;
type SelectPositionerProps = ComponentPropsWithoutRef<typeof Primitive.Positioner>;
type SelectItemProps = ComponentPropsWithoutRef<typeof Primitive.Item>;

export function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  return (
    <Primitive.Trigger className={cnState(selectTriggerStyles(), className)} {...props}>
      {children}
      <SelectIcon className="size-3.5 text-fe-muted-foreground" render={<ChevronDown />} />
    </Primitive.Trigger>
  );
}

interface SelectContentProps extends SelectPopupProps {
  sideOffset?: number;
  align?: SelectPositionerProps['align'];
}

export function SelectContent({ sideOffset = 6, align, className, ...props }: SelectContentProps) {
  return (
    <Primitive.Portal>
      <Primitive.Positioner sideOffset={sideOffset} align={align}>
        <Primitive.Popup className={cnState(selectPopupStyles(), className)} {...props} />
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <Primitive.Item className={cnState(selectItemStyles(), className)} {...props}>
      {children}
      <Primitive.ItemIndicator className="ms-auto size-3.5" render={<CheckIcon />} />
    </Primitive.Item>
  );
}
