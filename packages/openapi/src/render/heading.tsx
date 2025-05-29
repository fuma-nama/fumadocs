import type { ReactNode } from 'react';
import { Heading } from 'fumadocs-ui/components/heading';
import type { RenderContext } from '@/types';

export function heading(
  depth: number,
  text: string,
  ctx: RenderContext,
  children: ReactNode = text,
): ReactNode {
  const id = ctx.slugger.slug(text);

  return (
    <Heading id={id} key={id} as={`h${depth.toString()}` as `h1`}>
      {children}
    </Heading>
  );
}
