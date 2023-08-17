'use client'

import { ThemeSwitch } from '@/components/ThemeSwitch'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { useMDXComponent } from 'next-contentlayer/hooks'
import defaultComponents from 'next-docs-ui/mdx'
import type { HTMLAttributes } from 'react'

const components = {
  ...defaultComponents,
  pre: (props: HTMLAttributes<HTMLPreElement>) => (
    <defaultComponents.pre {...props} className="max-h-[400px]" />
  ),
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

export function Content({ code }: { code: string }) {
  const inject = `if (typeof process === 'undefined') {globalThis.process = { env: {} }}`
  const MDX = useMDXComponent(inject + code)

  return <MDX components={components} />
}
