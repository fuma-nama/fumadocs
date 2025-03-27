'use client';
import { type AnchorHTMLAttributes, forwardRef } from 'react';
import { Link as Base } from '@/framework';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * If the href is an external URL
   *
   * automatically determined by default
   */
  external?: boolean;

  /**
   * Prefetch links, supported on Next.js
   */
  prefetch?: boolean;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  (
    {
      href = '#',
      external = !(
        href.startsWith('/') ||
        href.startsWith('#') ||
        href.startsWith('.')
      ),
      prefetch,
      ...props
    },
    ref,
  ) => {
    if (external) {
      return (
        <a
          ref={ref}
          href={href}
          rel="noreferrer noopener"
          target="_blank"
          {...props}
        >
          {props.children}
        </a>
      );
    }

    return <Base ref={ref} href={href} prefetch={prefetch} {...props} />;
  },
);

Link.displayName = 'Link';

export { Link as default };
