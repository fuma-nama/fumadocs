'use client';

import { forwardRef, useMemo } from 'react';
import Link, { type LinkProps } from './link';
import { useParams } from '@/framework';

export type DynamicLinkProps = LinkProps;

/**
 * Extends the default `Link` component
 *
 * It supports dynamic hrefs, which means you can use `/[lang]/my-page` with `dynamicHrefs` enabled
 */

export const DynamicLink = forwardRef<HTMLAnchorElement, DynamicLinkProps>(
  ({ href, ...props }, ref) => {
    const params = useParams();

    const url = useMemo(() => (href ? updateHref(href, params) : href), [params, href]);

    return <Link ref={ref} href={url} {...props} />;
  },
);

DynamicLink.displayName = 'DynamicLink';

export function updateHref(href: string, params: Record<string, string | string[]>) {
  return href.replace(/\[(.*)]\/?/, (match, key) => {
    const hasEndingSlash = match[match.length - 1] === '/';
    const value = key in params ? params[key] : undefined;
    if (!value) return '';

    const replacement = typeof value === 'string' ? value : value.join('/');
    return hasEndingSlash ? `${replacement}/` : replacement;
  });
}

export default DynamicLink;
