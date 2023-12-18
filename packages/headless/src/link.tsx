import Original from 'next/link';
import { forwardRef, type AnchorHTMLAttributes } from 'react';

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /**
   * If the href is an external URL
   *
   * automatically determined by default
   */
  external?: boolean;
};

/**
 * Wraps `next/link` and safe to use in mdx documents
 */
const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  (
    {
      href = '#',
      external = !(
        href.startsWith('/') ||
        href.startsWith('#') ||
        href.startsWith('.')
      ),
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

    return <Original ref={ref} href={href} {...props} />;
  },
);

Link.displayName = 'Link';

export { Link as default };
