'use client'

import NextImage, { type ImageProps } from 'next/image'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export { Card, Cards } from '@/components/mdx/card'
export { Pre } from '@/components/mdx/pre'
export { Heading } from '@/components/mdx/heading'
export { SafeLink as Link } from 'next-docs-zeta/link'

export const Image = (props: ComponentPropsWithoutRef<'img'>) => (
  <NextImage
    sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 70vw, 800px"
    {...(props as ImageProps)}
  />
)

export const Table = (props: ComponentPropsWithoutRef<'table'>) => (
  <div className="nd-relative nd-overflow-auto">
    <table {...props} />
  </div>
)

export function MDXContent({ children }: { children: ReactNode }) {
  return (
    <div className="nd-prose nd-prose-text prose-table:nd-whitespace-nowrap nd-max-w-none">
      {children}
    </div>
  )
}
