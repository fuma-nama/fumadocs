'use client'

import { ThemeSwitch } from '@/components/ThemeSwitch'
import { useMDXComponent } from 'next-contentlayer/hooks'
import { Accordion, Accordions } from 'next-docs-ui/components/accordion'
import { Callout } from 'next-docs-ui/components/callout'
import { ImageZoom } from 'next-docs-ui/components/image-zoom'
import { Tab, Tabs } from 'next-docs-ui/components/tabs'
import { TypeTable } from 'next-docs-ui/components/type-table'
import defaultComponents from 'next-docs-ui/mdx'
import { type HTMLAttributes } from 'react'

const components = {
  ...defaultComponents,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  img: (props: any) => <ImageZoom {...props} />,
  pre: (props: HTMLAttributes<HTMLPreElement>) => (
    <defaultComponents.pre {...props} className="max-h-[400px]" />
  ),
  ThemeSwitch,
  Callout,
  TypeTable,
  Accordion,
  Accordions,
  Tab,
  Tabs,
  blockquote: (props: React.QuoteHTMLAttributes<HTMLQuoteElement>) => (
    <Callout className="my-4">{props.children}</Callout>
  )
}

export function Content({ code }: { code: string }) {
  const inject = `if (typeof process === 'undefined') {globalThis.process = { env: {} }}`
  const MDX = useMDXComponent(inject + code)

  return <MDX components={components} />
}
