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
import { ComponentType } from 'react'

const client = await import('@/internal/mdx-client')

const Pre = (p => <client.Pre {...p} ref={undefined} />) as ComponentType<
  JSX.IntrinsicElements['pre']
>

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
