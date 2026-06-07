'use client';
import {
  DynamicCodeBlock,
  type DynamicCodeblockProps,
} from 'fumadocs-ui/components/dynamic-codeblock.core';
import { useRenderContext } from '../contexts/api';
import { createContext, type ReactNode, use } from 'react';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';

const CodeBlockContext = createContext<ShikiFactory | null>(null);

export function ClientCodeBlock(props: Omit<DynamicCodeblockProps, 'highlighter' | 'options'>) {
  const { shikiOptions, components: { CodeBlock: Comp } = {} } = useRenderContext();
  if (Comp) return <Comp lang={props.lang} code={props.code} />;

  const ctx = use(CodeBlockContext);
  if (!ctx)
    throw new Error(
      'Missing Shiki context, please wrap your <OpenAPIPage /> component under <ClientCodeBlockProvider />',
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
