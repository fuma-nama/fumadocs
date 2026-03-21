'use client';
import * as React from 'react';
import { NavigationMenu as Primitive } from '@base-ui/react/navigation-menu';
import { cn } from '@/utils/cn';

export type NavigationMenuContentProps = Primitive.Content.Props;
export type NavigationMenuTriggerProps = Primitive.Trigger.Props;

export const NavigationMenu = Primitive.Root;
export const NavigationMenuList = Primitive.List;

export function NavigationMenuItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={(s) => cn('list-none', typeof className === 'function' ? className(s) : className)}
      {...props}
    >
      {children}
    </Primitive.Item>
  );
}

export function NavigationMenuTrigger({
  children,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.Trigger>) {
  return <Primitive.Trigger {...props}>{children}</Primitive.Trigger>;
}

export function NavigationMenuContent({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      className={(s) =>
        cn(
          'size-full p-3',
          'transition-[opacity,transform,translate] duration-(--duration) ease-(--easing)',
          'data-starting-style:opacity-0 data-ending-style:opacity-0',
          'data-starting-style:data-[activation-direction=left]:-translate-x-1/2',
          'data-starting-style:data-[activation-direction=right]:translate-x-1/2',
          'data-ending-style:data-[activation-direction=left]:translate-x-1/2',
          'data-ending-style:data-[activation-direction=right]:-translate-x-1/2',
          typeof className === 'function' ? className(s) : className,
        )
      }
      {...props}
    />
  );
}

export function NavigationMenuLink({
  children,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.Link>) {
  return <Primitive.Link {...props}>{children}</Primitive.Link>;
}

export function NavigationMenuViewport(props: Primitive.Positioner.Props) {
  return (
    <Primitive.Portal>
      <Primitive.Positioner
        collisionPadding={{ top: 5, bottom: 5, left: 20, right: 20 }}
        {...props}
        className={(s) =>
          cn(
            "box-border h-(--positioner-height) w-(--anchor-width) max-w-(--available-width) duration-(--duration) ease-(--easing) before:absolute before:content-[''] data-instant:transition-none data-[side=bottom]:before:top-[-10px] data-[side=bottom]:before:right-0 data-[side=bottom]:before:left-0 data-[side=bottom]:before:h-2.5 data-[side=left]:before:top-0 data-[side=left]:before:right-[-10px] data-[side=left]:before:bottom-0 data-[side=left]:before:w-2.5 data-[side=right]:before:top-0 data-[side=right]:before:bottom-0 data-[side=right]:before:left-[-10px] data-[side=right]:before:w-2.5 data-[side=top]:before:right-0 data-[side=top]:before:bottom-[-10px] data-[side=top]:before:left-0 data-[side=top]:before:h-2.5",
            typeof props.className === 'function' ? props.className(s) : props.className,
          )
        }
        style={{
          ['--duration' as string]: '0.35s',
          ['--easing' as string]: 'cubic-bezier(0.22, 1, 0.36, 1)',
          ...props.style,
        }}
      >
        <Primitive.Popup className="data-[ending-style]:easing-[ease] relative border h-(--popup-height) origin-(--transform-origin) rounded-xl bg-fd-popover/80 text-fd-popover-foreground backdrop-blur-md shadow-lg transition-[opacity,transform,width,height,scale,translate] duration-(--duration) ease-(--easing) data-ending-style:scale-90 data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-90 data-starting-style:opacity-0 w-(--popup-width)">
          <Primitive.Viewport className="relative size-full overflow-hidden" />
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}
