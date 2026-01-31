'use client';
import { useShikiConfigOptional } from 'fumadocs-core/highlight/core/client';
import * as base from './dynamic-codeblock.core';
import { withJSEngine } from 'fumadocs-core/highlight/full/config';

export function DynamicCodeBlock(props: base.DynamicCodeblockProps) {
  const config = useShikiConfigOptional() ?? withJSEngine;
  return (
    <base.DynamicCodeBlock
      {...props}
      options={{
        config,
        ...props.options,
      }}
    />
  );
}

export type { DynamicCodeblockProps } from './dynamic-codeblock.core';
