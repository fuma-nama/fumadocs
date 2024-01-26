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
import { buttonVariants } from '@/theme/variants';

const variants = cva('divide-y divide-border');

export const Accordions = forwardRef<
  HTMLDivElement,
  AccordionSingleProps | AccordionMultipleProps
>((props, ref) => {
  if (props.type === 'multiple') {
    return <MultipleAccordions ref={ref} {...props} />;
  }

  return (
    <SingleAccordions
      ref={ref}
      {...props}
      // If type is undefined
      type="single"
    />
  );
});

Accordions.displayName = 'Accordions';

export const MultipleAccordions = forwardRef<
  HTMLDivElement,
  AccordionMultipleProps
>(({ className, defaultValue, ...props }, ref) => {
  const [defValue, setDefValue] = useState(defaultValue);
  const value = props.value ?? defValue;
  const setValue = props.onValueChange?.bind(props) ?? setDefValue;

  useEffect(() => {
    if (window.location.hash.length > 0)
      setValue([window.location.hash.substring(1)]);
  }, [setValue]);

  return (
    <AccordionPrimitive.Root
      ref={ref}
      value={value}
      onValueChange={setValue}
      className={cn(variants(), className)}
      {...props}
    />
  );
});

MultipleAccordions.displayName = 'MultipleAccordions';

export const SingleAccordions = forwardRef<
  HTMLDivElement,
  AccordionSingleProps
>(({ className, defaultValue, ...props }, ref) => {
  const [defValue, setDefValue] = useState(defaultValue);
  const value = props.value ?? defValue;
  const setValue = props.onValueChange?.bind(props) ?? setDefValue;

  useEffect(() => {
    if (window.location.hash.length > 0)
      setValue(window.location.hash.substring(1));
  }, [setValue]);

  return (
    <AccordionPrimitive.Root
      ref={ref}
      value={value}
      onValueChange={setValue}
      collapsible
      className={cn(variants(), className)}
      {...props}
    />
  );
});

SingleAccordions.displayName = 'SingleAccordions';

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
      <AccordionPrimitive.Header className="not-prose flex items-center text-medium text-muted-foreground">
        <AccordionPrimitive.Trigger className="flex w-full items-center gap-1 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronRightIcon className="size-5 transition-transform duration-200 group-data-[state=open]/accordion:rotate-90" />
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
      className={cn(
        buttonVariants({
          color: 'ghost',
          className:
            'opacity-0 transition-all group-data-[state=open]/accordion:opacity-100',
        }),
      )}
      onClick={onClick}
    >
      {checked ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <LinkIcon className="size-3.5" />
      )}
    </button>
  );
}

Accordion.displayName = 'Accordion';
