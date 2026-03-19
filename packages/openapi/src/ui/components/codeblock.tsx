'use client';
import {
  DynamicCodeBlock,
  type DynamicCodeblockProps,
} from 'fumadocs-ui/components/dynamic-codeblock.core';
import { useApiContext } from '../contexts/api';
import { createContext, type ReactNode, use } from 'react';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';

const CodeBlockContext = createContext<ShikiFactory | null>(null);

export function ClientCodeBlock(props: Omit<DynamicCodeblockProps, 'highlighter' | 'options'>) {
  const { shikiOptions } = useApiContext();
  const ctx = use(CodeBlockContext);
  if (!ctx)
    throw new Error(
      'Missing Shiki context, please wrap your <APIPage /> component under <ClientCodeBlockProvider />',
    );

  return <DynamicCodeBlock highlighter={() => ctx.getOrInit()} options={shikiOptions} {...props} />;
}

export function ClientCodeBlockProvider({
  factory,
  children,
}: {
  factory: ShikiFactory;
  children: ReactNode;
}) {
  return <CodeBlockContext value={factory}>{children}</CodeBlockContext>;
}
