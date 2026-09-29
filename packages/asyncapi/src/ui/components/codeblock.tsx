'use client';
import type { ComponentProps } from 'react';
import { type AsyncAPIComponents, useComponents } from '@/utils/create-page';

export function ClientCodeBlock(props: ComponentProps<AsyncAPIComponents['CodeBlock']>) {
  const { CodeBlock } = useComponents();

  return <CodeBlock {...props} />;
}
