'use client';
import { type CodeBlockProps, useComponents } from '@/utils/create-page';

export function ClientCodeBlock(props: CodeBlockProps) {
  const { CodeBlock } = useComponents();

  return <CodeBlock {...props} />;
}
