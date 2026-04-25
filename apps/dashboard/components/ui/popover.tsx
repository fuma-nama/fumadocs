'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { Popover } from '@base-ui/react/popover';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

export const PopoverRoot = Popover.Root;
export const PopoverPortal = Popover.Portal;
export const PopoverPositioner = Popover.Positioner;
export const PopoverTrigger = Popover.Trigger;
export const PopoverClose = Popover.Close;

const popoverContentVariants = cva(
  'z-30 rounded-lg border border-fe-border bg-fe-popover p-3 text-fe-popover-foreground shadow-2xl',
  {
    variants: {
      size: {
        sm: 'w-72',
        md: 'w-[360px]',
        lg: 'w-[420px]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

interface PopoverContentProps
  extends
    Omit<ComponentPropsWithoutRef<typeof Popover.Popup>, 'className'>,
    VariantProps<typeof popoverContentVariants> {}
interface PopoverContentWithClassNameProps extends PopoverContentProps {
  className?: string;
}

export function PopoverContent({
  size = 'md',
  className,
  ...props
}: PopoverContentWithClassNameProps) {
  return <Popover.Popup className={cn(popoverContentVariants({ size }), className)} {...props} />;
}
