import type { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import type { Callout } from 'fumadocs-ui/components/callout';
import type { ComponentPropsWithoutRef } from 'react';

type ToDisplay<O extends Record<string, unknown>> = {
  [K in keyof O]-?: O[K];
};

export type AccordionsProps = ToDisplay<
  Omit<
    ComponentPropsWithoutRef<typeof Accordions>,
    keyof ComponentPropsWithoutRef<'div'> | 'value' | 'onValueChange'
  >
>;

export type AccordionProps = ToDisplay<
  Omit<
    ComponentPropsWithoutRef<typeof Accordion>,
    keyof ComponentPropsWithoutRef<'div'>
  >
>;

export type CalloutProps = ToDisplay<
  Omit<
    ComponentPropsWithoutRef<typeof Callout>,
    keyof ComponentPropsWithoutRef<'div'>
  >
>;
