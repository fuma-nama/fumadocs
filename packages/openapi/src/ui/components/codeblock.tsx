'use client';
import type { ComponentProps } from 'react';
import { type OpenAPIComponents, useComponents } from '@/utils/create-page';

export function ClientCodeBlock(props: ComponentProps<OpenAPIComponents['CodeBlock']>) {
  const { CodeBlock } = useComponents();

  return <CodeBlock {...props} />;
}
