'use client';
import type { ComponentProps } from 'react';
import { useAnchorId } from 'shared-api/auto-anchor/client';
import { useComponents } from '@/headless';

/**
 * A heading of the page, `id` is resolved against the anchor sections it is under.
 */
export function Heading({ id, ...props }: ComponentProps<'h1'> & { id: string; depth: number }) {
  const { Heading: Comp } = useComponents();

  return <Comp id={useAnchorId([id])} {...props} />;
}
