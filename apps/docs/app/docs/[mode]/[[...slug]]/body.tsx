'use client'

import { Pre } from '@/components/pre'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { useMDXComponent } from 'next-contentlayer/hooks'
import { Card, Cards, Heading, Image, Link, Table } from 'next-docs-ui/mdx'

const components = {
  Card,
  Cards,
  a: Link,
  pre: Pre,
  img: Image,
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h1" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h2" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h3" {...props} />
  ),
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h4" {...props} />
  ),
  h5: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h5" {...props} />
  ),
  h6: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h6" {...props} />
  ),
  table: Table,
  Accordion,
  AccordionTrigger,
  AccordionItem,
  AccordionContent,
  ThemeSwitch,
  blockquote: (props: React.QuoteHTMLAttributes<HTMLQuoteElement>) => (
    <div className="my-4 rounded-lg border px-3 text-sm shadow-md">
      {props.children}
    </div>
  )
}

export function DocumentBody({ code }: { code: string }) {
  const inject = `if (typeof process === 'undefined') {globalThis.process = { env: {} }}`
  const MDX = useMDXComponent(inject + code)

  return <MDX components={components} />
}
