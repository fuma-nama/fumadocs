'use client';

import { Accordion as Primitive } from '@base-ui/react/accordion';
import { ChevronRight } from '@fumadocs/ui-utils/icons';
import { type ComponentProps } from 'react';
import { cn } from '@fumadocs/ui-utils/utils/cn';

export function Accordion({
  className,
  ...props
}: ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      className={(s) =>
        cn(
          'divide-y divide-fd-border overflow-hidden rounded-lg border bg-fd-card',
          typeof className === 'function' ? className(s) : className,
        )
      }
      {...props}
    />
  );
}

export function AccordionItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={(s) =>
        cn(
          'scroll-m-24',
          typeof className === 'function' ? className(s) : className,
        )
      }
      {...props}
    >
      {children}
    </Primitive.Item>
  );
}

export function AccordionHeader({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Header>) {
  return (
    <Primitive.Header
      className={(s) =>
        cn(
          'not-prose flex flex-row items-center text-fd-card-foreground font-medium has-focus-visible:bg-fd-accent',
          typeof className === 'function' ? className(s) : className,
        )
      }
      {...props}
    >
      {children}
    </Primitive.Header>
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      className={(s) =>
        cn(
          'group flex flex-1 items-center gap-2 px-3 py-2.5 text-start focus-visible:outline-none',
          typeof className === 'function' ? className(s) : className,
        )
      }
      {...props}
    >
      <ChevronRight className="size-4 shrink-0 text-fd-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
      {children}
    </Primitive.Trigger>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Panel>) {
  return (
    <Primitive.Panel
      className={(s) =>
        cn(
          'overflow-hidden data-[state=closed]:animate-fd-accordion-up data-[state=open]:animate-fd-accordion-down',
          typeof className === 'function' ? className(s) : className,
        )
      }
      {...props}
    >
      {children}
    </Primitive.Panel>
  );
}
