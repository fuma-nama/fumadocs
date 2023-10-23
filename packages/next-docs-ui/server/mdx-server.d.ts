import type { SafeLink } from 'next-docs-zeta/link'
import type { HTMLAttributes } from 'react'
import type { Card, Cards, Image, Pre, Table } from '../dist/mdx'

declare const default_image_sizes: string

declare const defaultMdxComponents: {
  Card: Card
  Cards: Cards
  h1: (p: HTMLAttributes<HTMLHeadingElement>) => JSX.Element
  h2: (p: HTMLAttributes<HTMLHeadingElement>) => JSX.Element
  h3: (p: HTMLAttributes<HTMLHeadingElement>) => JSX.Element
  h4: (p: HTMLAttributes<HTMLHeadingElement>) => JSX.Element
  h5: (p: HTMLAttributes<HTMLHeadingElement>) => JSX.Element
  h6: (p: HTMLAttributes<HTMLHeadingElement>) => JSX.Element
  img: Image
  a: SafeLink
  pre: Pre
  table: Table
}

export { defaultMdxComponents as default, default_image_sizes }
