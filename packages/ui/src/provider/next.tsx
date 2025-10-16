'use client';
import type { ComponentProps } from 'react';
import { RootProvider as BaseProvider } from '@/provider/base';
import { NextProvider } from 'fumadocs-core/framework/next';

export function RootProvider(props: ComponentProps<typeof BaseProvider>) {
  return (
    <NextProvider>
      <BaseProvider {...props}>{props.children}</BaseProvider>
    </NextProvider>
  );
}
