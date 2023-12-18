'use client';

import { useParams } from 'next/navigation';
import { forwardRef, useMemo } from 'react';
import Link, { type LinkProps } from './link';

export type DynamicLinkProps = LinkProps;

/**
 * Extends the default `Link` component
 *
 * It supports dynamic hrefs, which means you can use `/[lang]/my-page` with `dynamicHrefs` enabled
 */

export const DynamicLink = forwardRef<HTMLAnchorElement, DynamicLinkProps>(
  ({ href, ...props }, ref) => {
    const params = useParams();

    const url = useMemo(() => {
      return href?.replace(/\[.*\]/, (key) => {
        const mappedKey = key.slice(1, -1);
        const value = mappedKey in params ? params[mappedKey] : 'undefined';

        return typeof value === 'string' ? value : value.join('/');
      });
    }, [params, href]);

    return <Link ref={ref} href={url} {...props} />;
  },
);

DynamicLink.displayName = 'DynamicLink';

export default DynamicLink;
