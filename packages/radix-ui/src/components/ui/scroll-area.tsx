import * as Primitive from '@radix-ui/react-scroll-area';
import * as React from 'react';
import { cn } from '@/utils/cn';

export function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.Root>) {
  return (
    <Primitive.Root type="scroll" className={cn('overflow-hidden', className)} {...props}>
      {children}
      <Primitive.Corner />
      <ScrollBar orientation="vertical" />
    </Primitive.Root>
  );
}

export function ScrollViewport({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.Viewport>) {
  return (
    <Primitive.Viewport className={cn('size-full rounded-[inherit]', className)} {...props}>
      {children}
    </Primitive.Viewport>
  );
}

export function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.Scrollbar>) {
  return (
    <Primitive.Scrollbar
      orientation={orientation}
      className={cn(
        'flex select-none data-[state=hidden]:animate-fd-fade-out',
        orientation === 'vertical' && 'h-full w-1.5',
        orientation === 'horizontal' && 'h-1.5 flex-col',
        className,
      )}
      {...props}
    >
      <Primitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-fd-border" />
    </Primitive.Scrollbar>
  );
}

export type ScrollAreaProps = Primitive.ScrollAreaProps;
