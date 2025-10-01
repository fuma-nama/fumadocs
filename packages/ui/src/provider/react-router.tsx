'use client';
import type { ComponentProps } from 'react';
import { RootProvider as BaseProvider } from '@/provider/base';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';

export function RootProvider(props: ComponentProps<typeof BaseProvider>) {
  return (
    <ReactRouterProvider>
      <BaseProvider {...props}>{props.children}</BaseProvider>
    </ReactRouterProvider>
  );
}
