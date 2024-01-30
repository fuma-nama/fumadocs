'use client';

import * as React from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import { cn } from '@/utils/cn';

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = 'start', ...props }, ref) => (
  <HoverCardPrimitive.Portal>
    <HoverCardPrimitive.Content
      ref={ref}
      align={align}
      className={cn(
        'z-50 w-80 rounded-md border bg-popover p-2 text-popover-foreground shadow-md outline-none data-[state=closed]:animate-popover-out data-[state=open]:animate-popover-in',
        className,
      )}
      {...props}
    />
  </HoverCardPrimitive.Portal>
));

HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export {
  HoverCard as Popup,
  HoverCardTrigger as PopupTrigger,
  HoverCardContent as PopupContent,
};
