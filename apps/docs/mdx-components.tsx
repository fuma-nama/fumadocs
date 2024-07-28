import type { MDXComponents } from 'mdx/types';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import defaultComponents from 'fumadocs-ui/mdx';
import {
  CodeBlock,
  type CodeBlockProps,
  Pre,
} from 'fumadocs-ui/components/codeblock';
import { Popup, PopupContent, PopupTrigger } from 'fumadocs-ui/twoslash/popup';
import { Wrapper } from '@/components/preview/wrapper';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Popup,
    PopupContent,
    PopupTrigger,
    pre: (props: CodeBlockProps) => (
      <CodeBlock {...props}>
        <Pre className="max-h-[400px]">{props.children}</Pre>
      </CodeBlock>
    ),
    Tabs,
    Tab,
    Callout,
    TypeTable,
    Accordion,
    Accordions,
    Wrapper,
    blockquote: (props) => <Callout>{props.children}</Callout>,
    ...components,
  };
}
