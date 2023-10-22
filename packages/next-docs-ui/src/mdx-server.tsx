import { type HTMLAttributes } from 'react'
import {
  Card,
  Cards,
  default_image_sizes,
  Heading,
  Link,
  Pre,
  Table
} from './mdx'

const defaultMdxComponents = {
  Card: (p => <Card {...p} />) as typeof Card,
  Cards: (p => <Cards {...p} />) as typeof Cards,
  h1: (p: HTMLAttributes<HTMLHeadingElement>) => <Heading as="h1" {...p} />,
  h2: (p: HTMLAttributes<HTMLHeadingElement>) => <Heading as="h2" {...p} />,
  h3: (p: HTMLAttributes<HTMLHeadingElement>) => <Heading as="h3" {...p} />,
  h4: (p: HTMLAttributes<HTMLHeadingElement>) => <Heading as="h4" {...p} />,
  h5: (p: HTMLAttributes<HTMLHeadingElement>) => <Heading as="h5" {...p} />,
  h6: (p: HTMLAttributes<HTMLHeadingElement>) => <Heading as="h6" {...p} />,
  a: (p => <Link {...p} />) as typeof Link,
  pre: (p => <Pre {...p} />) as typeof Pre,
  table: (p => <Table {...p} />) as typeof Table
}

export { defaultMdxComponents as default, default_image_sizes }
