import Original, { type LinkProps as BaseProps } from 'next/link';
import { type AnchorHTMLAttributes, forwardRef } from 'react';

export interface LinkProps
  extends Pick<BaseProps, 'prefetch' | 'replace'>,
    AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * If the href is an external URL
   *
   * automatically determined by default
   */
  external?: boolean;
}

/**
 * Wraps `next/link` and safe to use in MDX documents
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
      prefetch,
      replace,
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

    return (
      <Original
        ref={ref}
        href={href}
        prefetch={prefetch}
        replace={replace}
        {...props}
      />
    );
  },
);

Link.displayName = 'Link';

export { Link as default };
