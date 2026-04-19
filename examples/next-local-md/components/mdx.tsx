import * as Accordions from 'fumadocs-ui/components/accordion';
import * as Tabs from 'fumadocs-ui/components/tabs';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as Icons from 'lucide-react';
import type { MDXComponents } from 'mdx/types';
import { FC } from 'react';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...(Icons as unknown as Record<keyof typeof Icons, FC>),
    ...Accordions,
    ...Tabs,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
