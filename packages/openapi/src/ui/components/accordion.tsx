'use client';

import * as Primitive from '@radix-ui/react-accordion';
import { ChevronRight } from 'lucide-react';
import { createContext, use, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { cn } from '@/utils/cn';
import { anchorIdStartsWith } from '@/utils/auto-anchor';
import { AnchorSection, useAnchorId } from '@/utils/auto-anchor.client';

const Context = createContext<{
  type: 'single' | 'multiple';
  setValue: (v: string | string[]) => void;
} | null>(null);

export function Accordions({
  type,
  defaultValue,
  ...props
}: Omit<ComponentProps<typeof Primitive.Root>, 'value' | 'onValueChange'>) {
  const [value, setValue] = useState<string | string[]>(() =>
    type === 'multiple' ? (defaultValue ?? []) : (defaultValue ?? ''),
  );

  return (
    <Context value={useMemo(() => ({ type, setValue }), [type])}>
      <Primitive.Root type={type} value={value as never} onValueChange={setValue} {...props} />
    </Context>
  );
}

export function AccordionItem({
  value,
  className,
  anchorSegments,
  ...props
}: ComponentProps<typeof Primitive.Item> & {
  /** define the accordion as an anchor section */
  anchorSegments?: string[];
}) {
  const ctx = use(Context)!;
  const id = useAnchorId(anchorSegments ?? false);

  useEffect(() => {
    if (id && anchorIdStartsWith(window.location.hash.slice(1), id))
      ctx.setValue(ctx.type === 'single' ? value : [value]);
  }, [value, id, ctx]);

  const content = (
    <Primitive.Item
      value={value}
      className={cn('scroll-m-20 border-b last:border-b-0', className)}
      {...props}
    />
  );
  return anchorSegments ? (
    <AnchorSection segments={anchorSegments}>{content}</AnchorSection>
  ) : (
    content
  );
}

export function AccordionContent(props: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      {...props}
      className={cn(
        'overflow-hidden data-[state=closed]:animate-fd-accordion-up data-[state=open]:animate-fd-accordion-down',
        props.className,
      )}
    />
  );
}

export function AccordionHeader(props: ComponentProps<typeof Primitive.Header>) {
  return (
    <Primitive.Header
      {...props}
      className={cn('not-prose flex py-2 text-fd-foreground font-medium', props.className)}
    >
      {props.children}
    </Primitive.Header>
  );
}

export function AccordionTrigger(props: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      {...props}
      className={cn(
        'flex flex-1 items-center gap-1 text-start group/accordion focus-visible:outline-none',
        props.className,
      )}
    >
      <ChevronRight className="size-3.5 text-fd-muted-foreground shrink-0 transition-transform group-focus-visible/accordion:text-fd-primary group-data-[state=open]/accordion:rotate-90" />
      {props.children}
    </Primitive.Trigger>
  );
}
