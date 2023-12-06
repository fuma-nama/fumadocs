import serverComponents, {
  Card,
  Cards,
  default_image_sizes,
  Heading,
  Image,
  Link,
  MDXContent,
  Table
} from '@/internal/mdx-server'
import type { ComponentType } from 'react'
import type { CodeBlockProps } from './components/mdx/pre'

const client = await import('@/internal/mdx-client')

const Pre = (p => <client.Pre {...p} />) as ComponentType<CodeBlockProps>

const defaultMdxComponents = {
  pre: Pre,
  ...serverComponents
}

export {
  defaultMdxComponents as default,
  Pre,
  Card,
  Cards,
  Heading,
  Image,
  Link,
  MDXContent,
  Table,
  default_image_sizes
}
