'use client';
import {
  DynamicCodeBlock,
  type DynamicCodeblockProps,
} from 'fumadocs-ui/components/dynamic-codeblock.core';
import { useRenderContext } from '../contexts/api';

export function ClientCodeBlock(props: Omit<DynamicCodeblockProps, 'highlighter' | 'options'>) {
  const { shiki, shikiOptions, components: { CodeBlock: Comp } = {} } = useRenderContext();
  if (Comp) return <Comp {...props} />;

  return (
    <DynamicCodeBlock highlighter={() => shiki.getOrInit()} options={shikiOptions} {...props} />
  );
}
