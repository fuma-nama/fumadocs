'use client';
import { type CodeBlockProps, useComponents } from '@/headless';

export function ClientCodeBlock(props: CodeBlockProps) {
  const { CodeBlock } = useComponents();

  return <CodeBlock {...props} />;
}
