'use client';

import { RootProvider as BaseProvider } from './base';
import type { ComponentProps } from 'react';
import { NextProvider } from 'fumadocs-core/framework/next';
export * from './base';

export function RootProvider(props: ComponentProps<typeof BaseProvider>) {
  return (
    <NextProvider>
      <BaseProvider {...props}>{props.children}</BaseProvider>
    </NextProvider>
  );
}

export * from './_contexts';
