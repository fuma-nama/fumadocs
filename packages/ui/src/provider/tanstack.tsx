'use client';
import type { ComponentProps } from 'react';
import { RootProvider as BaseProvider } from '@/provider/base';
import { TanstackProvider } from 'fumadocs-core/framework/tanstack';

export function RootProvider(props: ComponentProps<typeof BaseProvider>) {
  return (
    <TanstackProvider>
      <BaseProvider {...props}>{props.children}</BaseProvider>
    </TanstackProvider>
  );
}
