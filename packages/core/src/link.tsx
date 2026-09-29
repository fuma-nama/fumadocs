'use client';
import { type ComponentProps } from 'react';
import { Link as Base } from '@/framework';

export interface LinkProps extends ComponentProps<'a'> {
  /**
   * If the href is an external URL
   *
   * automatically determined by default
   */
  external?: boolean;

  /**
   * Prefetch links
   */
  prefetch?: boolean;
}

export function Link({
  ref,
  href = '#',
  // any protocol
  external = !!(
    href.match(/^\w+:/) ||
    // protocol relative URL
    href.startsWith('//')
  ),
  prefetch,
  children,
  ...props
}: LinkProps) {
  if (external) {
    return (
      <a ref={ref} href={href} rel="noreferrer noopener" target="_blank" {...props}>
        {children}
      </a>
    );
  }

  return (
    <Base ref={ref} href={href} prefetch={prefetch} {...props}>
      {children}
    </Base>
  );
}

export { Link as default };
