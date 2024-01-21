import type { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import type { Callout } from 'fumadocs-ui/components/callout';
import type { ComponentPropsWithoutRef, ReactNode as A } from 'react';

export type AccordionsProps = Required<
  Omit<
    ComponentPropsWithoutRef<typeof Accordions>,
    keyof ComponentPropsWithoutRef<'div'> | 'value' | 'onValueChange'
  >
>;

export type AccordionProps = Required<
  Omit<
    ComponentPropsWithoutRef<typeof Accordion>,
    keyof ComponentPropsWithoutRef<'div'>
  >
>;

type ReactNode = A;
export type CalloutProps = Required<
  Omit<
    ComponentPropsWithoutRef<typeof Callout>,
    keyof ComponentPropsWithoutRef<'div'> | 'icon'
  >
> & {
  icon: ReactNode;
};
