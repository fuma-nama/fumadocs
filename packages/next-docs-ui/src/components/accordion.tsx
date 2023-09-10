'use client'

import { cn } from '@/utils/cn'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef
} from 'react'

export const Accordions = forwardRef<
  ElementRef<typeof AccordionPrimitive.Root>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Root
    ref={ref}
    className={cn('nd-space-y-4', className)}
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
    className={cn(
      'nd-border nd-rounded-xl nd-bg-card nd-text-card-foreground',
      className
    )}
    {...props}
  >
    <AccordionPrimitive.Header className="nd-not-prose">
      <AccordionPrimitive.Trigger className="nd-flex nd-w-full nd-items-center nd-justify-between nd-p-4 nd-text-sm nd-font-medium [&[data-state=open]>svg]:nd-rotate-180">
        {title}
        <ChevronDown className="nd-h-4 nd-w-4 nd-transition-transform nd-duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
    <AccordionPrimitive.Content className="nd-px-4 nd-overflow-hidden nd-text-sm data-[state=closed]:nd-animate-accordion-up data-[state=open]:nd-animate-accordion-down">
      <div className="nd-pb-4">{children}</div>
    </AccordionPrimitive.Content>
  </AccordionPrimitive.Item>
))

Accordion.displayName = 'Accordion'
