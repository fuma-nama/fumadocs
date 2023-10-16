'use client'

import { ThemeSwitch } from '@/components/ThemeSwitch'
import type { LucideProps } from 'lucide-react'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
import { useMDXComponent } from 'next-contentlayer/hooks'
import { Accordion, Accordions } from 'next-docs-ui/components/accordion'
import { Callout } from 'next-docs-ui/components/callout'
import { ImageZoom } from 'next-docs-ui/components/image-zoom'
import { Tab, Tabs } from 'next-docs-ui/components/tabs'
import { TypeTable } from 'next-docs-ui/components/type-table'
import defaultComponents from 'next-docs-ui/mdx'
import dynamic from 'next/dynamic'
import type { HTMLAttributes } from 'react'

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
  Icon,
  blockquote: (props: React.QuoteHTMLAttributes<HTMLQuoteElement>) => (
    <Callout className="my-4">{props.children}</Callout>
  )
}

interface IconProps extends LucideProps {
  name: keyof typeof dynamicIconImports
}

function Icon({ name, ...props }: IconProps) {
  const LucideIcon = dynamic(dynamicIconImports[name])

  return <LucideIcon {...props} />
}

export function Content({ code }: { code: string }) {
  const inject = `if (typeof process === 'undefined') {globalThis.process = { env: {} }}`
  const MDX = useMDXComponent(inject + code)

  return <MDX components={components} />
}
