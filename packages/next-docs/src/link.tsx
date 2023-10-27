import Original from 'next/link'
import type { AnchorHTMLAttributes } from 'react'

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /**
   * If the href is an external URL
   *
   * automatically determined by default
   */
  external?: boolean
}

/**
 * Wraps `next/link` and safe to use in mdx documents
 */
export function Link({
  href = '/',
  external = !(
    href.startsWith('/') ||
    href.startsWith('#') ||
    href.startsWith('.')
  ),
  ...props
}: LinkProps) {
  if (external) {
    return (
      <a href={href} rel="noreferrer noopener" target="_blank" {...props} />
    )
  }

  return <Original href={href} {...props} />
}

/**
 * Legacy exports
 */
export { Link as default, Link as SafeLink, type LinkProps as SafeLinkProps }
