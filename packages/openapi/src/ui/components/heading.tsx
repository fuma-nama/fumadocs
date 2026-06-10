'use client';
import type { ComponentProps } from 'react';
import { Heading as BaseHeading } from 'fumadocs-ui/components/heading';
import { useRenderContext } from '../contexts/api';
import { useAnchorId } from '@fumadocs/api-docs/auto-anchor/client';

export function Heading({
  id: _id,
  depth,
  ...props
}: ComponentProps<'h1'> & { id: string; depth: number }) {
  const id = useAnchorId([_id]);
  const { renderHeading, components: { Heading: Comp } = {} } = useRenderContext();
  if (renderHeading) return renderHeading({ id, ...props }, depth);
  if (Comp) return <Comp id={id} depth={depth} {...props} />;

  return <BaseHeading id={id} as={`h${depth}` as `h1`} {...props} />;
}
