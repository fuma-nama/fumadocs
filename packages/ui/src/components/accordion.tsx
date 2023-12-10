'use client'

import { cn } from '@/utils/cn'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import type {
  AccordionMultipleProps,
  AccordionSingleProps
} from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef
} from 'react'

export const Accordions = forwardRef<
  ElementRef<typeof AccordionPrimitive.Root>,
  AccordionSingleProps | AccordionMultipleProps
>(({ className, type = 'single', ...props }, ref) => (
  // @ts-ignore
  <AccordionPrimitive.Root
    ref={ref}
    type={type}
    collapsible
    className={cn('space-y-4', className)}
    {...props}
  />
))

Accordions.displayName = 'Accordions'

export const Accordion = forwardRef<
  ElementRef<typeof AccordionPrimitive.Item>,
  Omit<ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>, 'value'> & {
    title: string
  }
>(({ className, title, children, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    value={title}
    className={cn('bg-card text-card-foreground rounded-xl border', className)}
    {...props}
  >
    <AccordionPrimitive.Header className="not-prose">
      <AccordionPrimitive.Trigger className="flex w-full items-center justify-between p-4 text-sm font-medium [&[data-state=open]>svg]:rotate-180">
        {title}
        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
    <AccordionPrimitive.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
      <div className="prose-no-margin p-4 pt-0 text-sm">{children}</div>
    </AccordionPrimitive.Content>
  </AccordionPrimitive.Item>
))

Accordion.displayName = 'Accordion'
