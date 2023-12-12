'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import type {
  AccordionMultipleProps,
  AccordionSingleProps,
} from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react';
import { cn } from '@/utils/cn';

export const Accordions = forwardRef<
  ElementRef<typeof AccordionPrimitive.Root>,
  AccordionSingleProps | AccordionMultipleProps
>(({ className, type = 'single', ...props }, ref) => (
  // @ts-expect-error -- Add default type
  <AccordionPrimitive.Root
    ref={ref}
    type={type}
    collapsible
    className={cn('space-y-4', className)}
    {...props}
  />
));

Accordions.displayName = 'Accordions';

export const Accordion = forwardRef<
  ElementRef<typeof AccordionPrimitive.Item>,
  Omit<ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>, 'value'> & {
    title: string;
  }
>(({ className, title, children, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    value={title}
    className={cn('rounded-xl border bg-card text-card-foreground', className)}
    {...props}
  >
    <AccordionPrimitive.Header className="not-prose">
      <AccordionPrimitive.Trigger className="flex w-full items-center justify-between p-4 text-sm font-medium [&[data-state=open]>svg]:rotate-180">
        {title}
        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
    <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
      <div className="p-4 pt-0 text-sm prose-no-margin">{children}</div>
    </AccordionPrimitive.Content>
  </AccordionPrimitive.Item>
));

Accordion.displayName = 'Accordion';
