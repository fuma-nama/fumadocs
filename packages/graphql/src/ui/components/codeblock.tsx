'use client';
import type { ComponentProps } from 'react';
import { type GraphQLComponents, useComponents } from '@/utils/create-page';

export function ClientCodeBlock(props: ComponentProps<GraphQLComponents['CodeBlock']>) {
  const { CodeBlock } = useComponents();

  return <CodeBlock {...props} />;
}
