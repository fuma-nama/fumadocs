import type { MDXComponents } from 'mdx/types'
import { Card, Cards, Heading, Link, Pre, Table } from 'next-docs-ui/mdx'
import NextImage from 'next/image'

function clientToServerMdxComponents(object: MDXComponents): MDXComponents {
  const entries = Object.entries(object).map(([k, Comp]) => {
    if (typeof Comp === 'function')
      return [k, (props: object) => <Comp {...props} />]

    return [k, Comp]
  })

  return Object.fromEntries(entries)
}

const defaultComponents = clientToServerMdxComponents({
  Card,
  Cards,
  h1: p => <Heading as="h1" {...p} />,
  h2: p => <Heading as="h2" {...p} />,
  h3: p => <Heading as="h3" {...p} />,
  h4: p => <Heading as="h4" {...p} />,
  h5: p => <Heading as="h5" {...p} />,
  h6: p => <Heading as="h6" {...p} />,
  Image: NextImage,
  a: Link,
  pre: Pre,
  table: Table
})

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...components
  }
}
