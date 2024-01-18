import type { MDXComponents } from 'mdx/types';
import { Accordion, Accordions } from '@fuma-docs/ui/components/accordion';
import { Callout } from '@fuma-docs/ui/components/callout';
import { Tab, Tabs } from '@fuma-docs/ui/components/tabs';
import { TypeTable } from '@fuma-docs/ui/components/type-table';
import defaultComponents from '@fuma-docs/ui/mdx/default';
import { Pre } from '@fuma-docs/ui/mdx/pre';
import type { ReactNode } from 'react';
import { Wrapper } from '@/components/preview/wrapper';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    pre: (props) => (
      <Pre {...props} ref={undefined} pre={{ className: 'max-h-[400px]' }} />
    ),
    Image: defaultComponents.img,
    Tabs,
    Tab,
    Callout,
    TypeTable,
    Accordion,
    Accordions,
    Wrapper,
    InstallTabs: ({
      items,
      children,
    }: {
      items: string[];
      children: ReactNode;
    }) => (
      <Tabs items={items} id="package-manager">
        {children}
      </Tabs>
    ),
    blockquote: (props) => <Callout>{props.children}</Callout>,
    ...components,
  };
}
