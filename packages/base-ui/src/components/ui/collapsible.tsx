'use client';
import { Collapsible as Primitive } from '@base-ui/react/collapsible';
import { type ComponentProps, useEffect, useState } from 'react';
import { cn } from '@fumadocs/ui-utils/utils/cn';

export const Collapsible = Primitive.Root;

export const CollapsibleTrigger = Primitive.Trigger;

export function CollapsibleContent({
  children,
  className,
  ...props
}: ComponentProps<typeof Primitive.Panel>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Primitive.Panel
      {...props}
      className={(s) =>
        cn(
          'overflow-hidden',
          mounted &&
            'data-[state=closed]:animate-fd-collapsible-up data-[state=open]:animate-fd-collapsible-down',
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
