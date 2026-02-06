'use client';
import { Collapsible as Primitive } from '@base-ui/react/collapsible';
import type { ComponentProps } from 'react';
import { cn } from '@/utils/cn';

export const Collapsible = Primitive.Root;

export const CollapsibleTrigger = Primitive.Trigger;

export function CollapsibleContent({
  children,
  className,
  ...props
}: ComponentProps<typeof Primitive.Panel>) {
  return (
    <Primitive.Panel
      {...props}
      className={(s) =>
        cn(
          "overflow-hidden [&[hidden]:not([hidden='until-found'])]:hidden h-(--collapsible-panel-height) transition-[height] data-[starting-style]:h-0 data-[ending-style]:h-0",
          typeof className === 'function' ? className(s) : className,
        )
      }
    >
      {children}
    </Primitive.Panel>
  );
}

export type CollapsibleProps = Primitive.Root.Props;
export type CollapsibleContentProps = Primitive.Panel.Props;
export type CollapsibleTriggerProps = Primitive.Trigger.Props;
