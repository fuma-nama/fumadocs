'use client';

import * as Primitive from '@radix-ui/react-accordion';
import { ChevronRight } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from 'fumadocs-ui/utils/cn';

export function Accordions(props: ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      {...props}
      className={cn(
        'divide-y divide-fd-border overflow-hidden',
        props.className,
      )}
    />
  );
}

export function AccordionItem(props: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item {...props} className={cn('scroll-m-20', props.className)}>
      {props.children}
    </Primitive.Item>
  );
}

export function AccordionContent(
  props: ComponentProps<typeof Primitive.Content>,
) {
  return (
    <Primitive.Content
      {...props}
      className={cn(
        'overflow-hidden px-1 data-[state=closed]:animate-fd-accordion-up data-[state=open]:animate-fd-accordion-down',
        props.className,
      )}
    >
      {props.children}
    </Primitive.Content>
  );
}

export function AccordionHeader(
  props: ComponentProps<typeof Primitive.Header>,
) {
  return (
    <Primitive.Header
      {...props}
      className={cn(
        'not-prose flex py-2 text-fd-foreground font-medium',
        props.className,
      )}
    >
      {props.children}
    </Primitive.Header>
  );
}

export function AccordionTrigger(
  props: ComponentProps<typeof Primitive.Trigger>,
) {
  return (
    <Primitive.Trigger
      {...props}
      className={cn(
        'flex flex-1 items-center gap-1 text-start group/accordion focus-visible:outline-none',
        props.className,
      )}
    >
      <ChevronRight className="size-3.5 text-fd-muted-foreground shrink-0 transition-transform group-data-[state=open]/accordion:rotate-90" />
      {props.children}
    </Primitive.Trigger>
  );
}
