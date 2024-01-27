import type { MDXComponents } from 'mdx/types';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import defaultComponents from 'fumadocs-ui/mdx';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import type { ReactNode } from 'react';
import { Wrapper } from '@/components/preview/wrapper';
import { AutoTypeTable } from './components/auto-type-table';
import { cn } from './utils/cn';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from './components/ui/popover';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Popover: HoverCard,
    PopoverTrigger: HoverCardTrigger,
    PopoverContent: HoverCardContent,
    pre: ({ ref: _ref, title, className, ...props }) => (
      <CodeBlock title={title}>
        <Pre className={cn('max-h-[400px]', className)} {...props} />
      </CodeBlock>
    ),
    AutoTypeTable,
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
