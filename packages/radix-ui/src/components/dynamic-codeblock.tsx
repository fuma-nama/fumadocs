'use client';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import * as Base from './dynamic-codeblock.core';

export type DynamicCodeblockProps = Omit<Base.DynamicCodeblockProps, 'highlighter' | 'options'> & {
  options?: Base.DynamicCodeblockProps['options'];
};

export function DynamicCodeBlock(props: DynamicCodeblockProps) {
  return (
    <Base.DynamicCodeBlock
      highlighter={() => defaultShikiFactory.getOrInit()}
      options={{ themes: { light: 'github-light', dark: 'github-dark' } }}
      {...props}
    />
  );
}
