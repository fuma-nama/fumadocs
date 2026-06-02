'use client';
import { useAnchorId } from '@/utils/auto-anchor.client';
import type { ComponentProps } from 'react';
import { Heading as BaseHeading } from 'fumadocs-ui/components/heading';

export function Heading({
  id: _id,
  depth,
  ...props
}: ComponentProps<'h1'> & { id: string; depth: number }) {
  const id = useAnchorId([_id]);

  return <BaseHeading id={id} as={`h${depth}` as `h1`} {...props} />;
}
