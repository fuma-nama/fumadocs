import { createElement } from './element';

export interface AccordionProps {
  title: string;
}

export interface TabsProps {
  items: string[];
}

export interface TabProps {
  value: string;
}

export interface APIInfoProps {
  method?: string;
  route: string;
}

export interface PropertyProps {
  name: string;
  type: string;
  required?: boolean;
  deprecated?: boolean;
}

export function api(...child: string[]): string {
  return createElement('API', {}, ...child);
}

export function apiExample(...child: string[]): string {
  return createElement('APIExample', {}, ...child);
}

export function root(...child: string[]): string {
  return createElement('Root', {}, ...child);
}

export function apiInfo(props: APIInfoProps, ...child: string[]): string {
  return createElement('APIInfo', props, ...child);
}

export function accordions(...child: string[]): string {
  return createElement('Accordions', {}, ...child);
}

export function accordion(props: AccordionProps, ...child: string[]): string {
  return createElement('Accordion', props, ...child);
}

export function tabs(props: TabsProps, ...child: string[]): string {
  return createElement('Tabs', props, ...child);
}

export function tab(props: TabProps, ...child: string[]): string {
  return createElement('Tab', props, ...child);
}

export function property(
  { required = false, deprecated = false, ...props }: PropertyProps,
  ...child: string[]
): string {
  return createElement(
    'Property',
    { required, deprecated, ...props },
    ...child,
  );
}
