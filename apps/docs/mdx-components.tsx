import type { MDXComponents } from 'mdx/types';
import {
  Accordion,
  Accordions,
} from '@maximai/fumadocs-ui/components/accordion';
import { Callout } from '@maximai/fumadocs-ui/components/callout';
import { Tab, Tabs } from '@maximai/fumadocs-ui/components/tabs';
import { TypeTable } from '@maximai/fumadocs-ui/components/type-table';
import defaultComponents from '@maximai/fumadocs-ui/mdx';
import {
  CodeBlock,
  type CodeBlockProps,
  Pre,
} from '@maximai/fumadocs-ui/components/codeblock';
import type { ReactNode } from 'react';
import {
  Popup,
  PopupContent,
  PopupTrigger,
} from '@maximai/fumadocs-ui/twoslash/popup';
import { Wrapper } from '@/components/preview/wrapper';
import { cn } from './utils/cn';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Popup,
    PopupContent,
    PopupTrigger,
    pre: ({ title, className, icon, allowCopy, ...props }: CodeBlockProps) => (
      <CodeBlock title={title} icon={icon} allowCopy={allowCopy}>
        <Pre className={cn('max-h-[400px]', className)} {...props} />
      </CodeBlock>
    ),
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
