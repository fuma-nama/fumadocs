import type { MDXComponents } from 'mdx/types';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import defaultComponents from 'fumadocs-ui/mdx';
import { Popup, PopupContent, PopupTrigger } from 'fumadocs-ui/twoslash/popup';
import { Wrapper } from '@/components/preview/wrapper';
import { openapi } from '@/utils/source';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Popup,
    PopupContent,
    PopupTrigger,
    Tabs,
    Tab,
    Callout,
    TypeTable,
    Accordion,
    Accordions,
    Wrapper,
    blockquote: (props) => <Callout>{props.children}</Callout>,
    APIPage: openapi.APIPage,
    ...components,
  };
}
