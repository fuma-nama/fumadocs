import { ScrollArea as Primitive } from '@base-ui/react/scroll-area';
import * as React from 'react';
import { cn } from '@fumadocs/ui-utils/utils/cn';

const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, children, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={(s) =>
      cn(
        'overflow-hidden',
        typeof className === 'function' ? className(s) : className,
      )
    }
    {...props}
  >
    {children}
    <Primitive.Corner />
    <ScrollBar orientation="vertical" />
  </Primitive.Root>
));

ScrollArea.displayName = Primitive.Root.displayName;

const ScrollViewport = React.forwardRef<
  React.ComponentRef<typeof Primitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof Primitive.Viewport>
>(({ className, children, ...props }, ref) => (
  <Primitive.Viewport
    ref={ref}
    className={(s) =>
      cn(
        'size-full rounded-[inherit]',
        typeof className === 'function' ? className(s) : className,
      )
    }
    {...props}
  >
    {children}
  </Primitive.Viewport>
));

ScrollViewport.displayName = Primitive.Viewport.displayName;

const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof Primitive.Scrollbar>,
  React.ComponentPropsWithoutRef<typeof Primitive.Scrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <Primitive.Scrollbar
    ref={ref}
    orientation={orientation}
    className={(s) =>
      cn(
        'flex select-none data-[state=hidden]:animate-fd-fade-out',
        orientation === 'vertical' && 'h-full w-1.5',
        orientation === 'horizontal' && 'h-1.5 flex-col',
        typeof className === 'function' ? className(s) : className,
      )
    }
    {...props}
  >
    <Primitive.Thumb className="relative flex-1 rounded-full bg-fd-border" />
  </Primitive.Scrollbar>
));
ScrollBar.displayName = Primitive.Scrollbar.displayName;

export { ScrollArea, ScrollBar, ScrollViewport };
export type ScrollAreaProps = Primitive.Root.Props;
