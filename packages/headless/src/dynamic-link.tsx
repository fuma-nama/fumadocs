'use client'

import Link, { type LinkProps } from './link'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'

export type DynamicLinkProps = LinkProps

/**
 * Extends the default `Link` component
 *
 * It supports dynamic hrefs, which means you can use `/[lang]/my-page` with `dynamicHrefs` enabled
 */
export function DynamicLink({ href = '/', ...props }: DynamicLinkProps) {
  const params = useParams()

  const url = useMemo(() => {
    return href.replace(/\[.*\]/, key => {
      const value = params[key.slice(1, -1)] ?? 'undefined'

      return typeof value === 'string' ? value : value.join('/')
    })
  }, [params, href])

  return <Link href={url} {...props} />
}
