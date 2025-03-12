'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import type {
  AccordionMultipleProps,
  AccordionSingleProps,
} from '@radix-ui/react-accordion';
import { Check, ChevronRight, LinkIcon } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  useState,
  useEffect,
} from 'react';
import { cn } from '@/utils/cn';
import { useCopyButton } from '@/utils/use-copy-button';
import { buttonVariants } from '@/components/ui/button';

export const Accordions = forwardRef<
  HTMLDivElement,
  | Omit<AccordionSingleProps, 'value' | 'onValueChange'>
  | Omit<AccordionMultipleProps, 'value' | 'onValueChange'>
>(({ type = 'single', className, defaultValue, ...props }, ref) => {
  const [value, setValue] = useState<string | string[]>(
    type === 'single' ? (defaultValue ?? '') : (defaultValue ?? []),
  );

  useEffect(() => {
    const id = window.location.hash.substring(1);

    if (id.length > 0)
      setValue((prev) => (typeof prev === 'string' ? id : [id, ...prev]));
  }, []);

  return (
    // @ts-expect-error -- Multiple types
    <AccordionPrimitive.Root
      type={type}
      ref={ref}
      value={value}
      onValueChange={setValue}
      collapsible={type === 'single' ? true : undefined}
      className={cn(
        'divide-y divide-fd-border overflow-hidden rounded-lg border bg-fd-card',
        className,
      )}
      {...props}
    />
  );
});

Accordions.displayName = 'Accordions';

export const Accordion = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>, 'value'> & {
    title: string;
  }
>(({ title, className, id, children, ...props }, ref) => {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      // Use `id` instead if presents
      value={id ?? title}
      className={cn('group/accordion relative scroll-m-20', className)}
      {...props}
    >
      <AccordionPrimitive.Header
        id={id}
        className="not-prose flex flex-row items-center text-fd-card-foreground font-medium has-focus-visible:bg-fd-accent"
      >
        <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-2 px-4 py-2.5 text-start focus-visible:outline-none">
          <ChevronRight className="-ms-1 size-4 shrink-0 text-fd-muted-foreground transition-transform duration-200 group-data-[state=open]/accordion:rotate-90" />
          {title}
        </AccordionPrimitive.Trigger>
        {id ? <CopyButton id={id} /> : null}
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-fd-accordion-up data-[state=open]:animate-fd-accordion-down">
        <div className="px-4 py-2 prose-no-margin">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
});

function CopyButton({ id }: { id: string }): React.ReactElement {
  const [checked, onClick] = useCopyButton(() => {
    const url = new URL(window.location.href);
    url.hash = id;

    void navigator.clipboard.writeText(url.toString());
  });

  return (
    <button
      type="button"
      aria-label="Copy Link"
      className={cn(
        buttonVariants({
          color: 'ghost',
          className: 'text-fd-muted-foreground me-2',
        }),
      )}
      onClick={onClick}
    >
      {checked ? (
        <Check className="size-3.5" />
      ) : (
        <LinkIcon className="size-3.5" />
      )}
    </button>
  );
}

Accordion.displayName = 'Accordion';
