'use client';
import { type CodeBlockProps, useComponents } from '../contexts/api';

export function ClientCodeBlock(props: CodeBlockProps) {
  const { CodeBlock } = useComponents();

  return <CodeBlock {...props} />;
}
