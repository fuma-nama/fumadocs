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
import { cn } from '@/utils/cn';
import { useCopyButton } from '@/utils/use-copy-button';

export const Accordions = forwardRef<
  HTMLDivElement,
  AccordionSingleProps | AccordionMultipleProps
>(({ className: originalClassName, defaultValue, ...props }, ref) => {
  const [value, setValue] = useState<string[]>(() => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }

    return [];
  });

  const className = cn('divide-y divide-border', originalClassName);

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
        className={className}
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
      className={className}
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
      <AccordionPrimitive.Header className="not-prose flex items-center text-muted-foreground">
        <AccordionPrimitive.Trigger className="flex w-full items-center gap-1 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronRightIcon className="h-5 w-5 transition-transform duration-200 group-data-[state=open]/accordion:rotate-90" />
          <span className="text-medium font-medium text-foreground">
            {title}
          </span>
        </AccordionPrimitive.Trigger>
        {props.id ? <CopyButton id={props.id} /> : null}
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="pb-4 pl-6 text-sm prose-no-margin">{children}</div>
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
      className="p-1 opacity-0 transition-opacity group-data-[state=open]/accordion:opacity-100"
      onClick={onClick}
    >
      {checked ? (
        <CheckIcon className="h-3.5 w-3.5" />
      ) : (
        <LinkIcon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

Accordion.displayName = 'Accordion';
