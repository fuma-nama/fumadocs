'use client'

import { Card, Cards } from '@/components/mdx/card'
import { Heading } from '@/components/mdx/heading'
import { Pre } from '@/components/mdx/pre'
import { SafeLink } from 'next-docs-zeta/link'
import NextImage, { type ImageProps } from 'next/image'
import type { ImgHTMLAttributes, ReactNode, TableHTMLAttributes } from 'react'
import { default_image_sizes } from './utils/config'

const Image = (props: ImgHTMLAttributes<HTMLImageElement>) => (
  <NextImage sizes={default_image_sizes} {...(props as ImageProps)} />
)

const Table = (props: TableHTMLAttributes<HTMLTableElement>) => (
  <div className="nd-relative nd-overflow-auto">
    <table {...props} />
  </div>
)

function MDXContent({ children }: { children: ReactNode }) {
  return <div className="nd-prose">{children}</div>
}

const defaultMdxComponents = {
  Card,
  Cards,
  a: SafeLink,
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
  table: Table
}

export {
  defaultMdxComponents as default,
  SafeLink as Link,
  default_image_sizes,
  Heading,
  Pre,
  Card,
  Cards,
  Image,
  Table,
  MDXContent
}
