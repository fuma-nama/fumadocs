'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import type {
  AccordionMultipleProps,
  AccordionSingleProps,
} from '@radix-ui/react-accordion';
import { CheckIcon, ChevronRightIcon, LinkIcon } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  useState,
  useEffect,
} from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { useCopyButton } from '@/utils/use-copy-button';

const rootVariants = cva('divide-y divide-border');

export const Accordions = forwardRef<
  HTMLDivElement,
  AccordionSingleProps | AccordionMultipleProps
>(({ className, ...props }, ref) => {
  const [value, setValue] = useState<string[]>([]);

  useEffect(() => {
    if (window.location.hash.length > 0)
      setValue([window.location.hash.substring(1)]);
  }, []);

  if (props.type === 'multiple') {
    return (
      <AccordionPrimitive.Root
        ref={ref}
        value={value}
        onValueChange={setValue}
        className={cn(rootVariants({ className }))}
        {...props}
      />
    );
  }

  return (
    <AccordionPrimitive.Root
      ref={ref}
      value={value[0]}
      onValueChange={(v) => {
        setValue([v]);
      }}
      collapsible
      className={cn(rootVariants({ className }))}
      {...props}
      // If type is undefined
      type="single"
    />
  );
});

Accordions.displayName = 'Accordions';

export const Accordion = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>, 'value'> & {
    title: string;
  }
>(({ title, className, children, ...props }, ref) => {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      // Use `id` instead if presents
      value={props.id ?? title}
      className={cn('group/accordion scroll-m-20', className)}
      {...props}
    >
      <AccordionPrimitive.Header className="not-prose flex items-center">
        <AccordionPrimitive.Trigger className="flex w-full items-center gap-1 px-1 py-4 text-medium font-medium text-foreground [&[data-state=open]>svg]:rotate-90">
          <ChevronRightIcon className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
          {title}
        </AccordionPrimitive.Trigger>
        {props.id ? <CopyButton id={props.id} /> : null}
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="pb-4 pl-7 text-sm prose-no-margin">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
});

function CopyButton({ id }: { id: string }): JSX.Element {
  const [checked, onClick] = useCopyButton(() => {
    const url = new URL(window.location.href);
    url.hash = id;

    void navigator.clipboard.writeText(url.toString());
  });

  return (
    <button
      type="button"
      aria-label="Copy Link"
      className="text-muted-foreground opacity-0 transition-opacity group-hover/accordion:opacity-100"
      onClick={onClick}
    >
      {checked ? (
        <CheckIcon className="h-4 w-4" />
      ) : (
        <LinkIcon className="h-4 w-4" />
      )}
    </button>
  );
}

Accordion.displayName = 'Accordion';
