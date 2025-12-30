'use client';
import { Popover as Primitive } from '@base-ui/react/popover';
import * as React from 'react';
import { cn } from '@fumadocs/ui/cn';

const Popover = Primitive.Root;

const PopoverTrigger = Primitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Popup>,
  React.ComponentPropsWithoutRef<typeof Primitive.Popup> &
    Pick<Primitive.Positioner.Props, 'sideOffset' | 'align'>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Positioner align={align} side="bottom" sideOffset={sideOffset} className="z-50">
      <Primitive.Popup
        ref={ref}
        className={(s) =>
          cn(
            'z-50 origin-(--transform-origin) overflow-y-auto max-h-(--available-height) min-w-[240px] max-w-[98vw] rounded-xl border bg-fd-popover/60 backdrop-blur-lg p-2 text-sm text-fd-popover-foreground shadow-lg focus-visible:outline-none data-[closed]:animate-fd-popover-out data-[open]:animate-fd-popover-in',
            typeof className === 'function' ? className(s) : className,
          )
        }
        {...props}
      />
    </Primitive.Positioner>
  </Primitive.Portal>
));
PopoverContent.displayName = Primitive.Popup.displayName;

const PopoverClose = Primitive.Close;

export { Popover, PopoverTrigger, PopoverContent, PopoverClose };
