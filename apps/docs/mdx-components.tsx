import { Wrapper } from '@/components/preview/wrapper'
import type { MDXComponents } from 'mdx/types'
import { Accordion, Accordions } from 'next-docs-ui/components/accordion'
import { Callout } from 'next-docs-ui/components/callout'
import { Tab, Tabs } from 'next-docs-ui/components/tabs'
import { TypeTable } from 'next-docs-ui/components/type-table'
import defaultComponents from 'next-docs-ui/mdx-server'
import type { ReactNode } from 'react'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    pre: props => (
      <defaultComponents.pre {...props} className="max-h-[400px]" />
    ),
    Image: defaultComponents.img,
    Tabs: (p => <Tabs {...p} />) as typeof Tabs,
    Tab: (p => <Tab {...p} />) as typeof Tab,
    Callout: (p => <Callout {...p} />) as typeof Callout,
    TypeTable: (p => <TypeTable {...p} />) as typeof TypeTable,
    Accordion: (p => <Accordion {...p} />) as typeof Accordion,
    Accordions: (p => <Accordions {...p} />) as typeof Accordions,
    Wrapper,
    InstallTabs: ({
      items,
      children
    }: {
      items: string[]
      children: ReactNode
    }) => (
      <Tabs items={items} id="package-manager">
        {children}
      </Tabs>
    ),
    blockquote: props => <Callout>{props.children}</Callout>,
    ...components
  }
}
