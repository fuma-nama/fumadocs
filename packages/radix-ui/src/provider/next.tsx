'use client';
import type { ComponentProps } from 'react';
import { RootProvider as BaseProvider } from '@/provider/base';
import { NextProvider } from 'fumadocs-core/framework/next';
import type { Framework } from 'fumadocs-core/framework';

export interface RootProviderProps extends ComponentProps<typeof BaseProvider> {
  /**
   * Custom framework components to override Next.js defaults
   */
  components?: {
    Link?: Framework['Link'];
    Image?: Framework['Image'];
  };
}

export function RootProvider({ components, ...props }: RootProviderProps) {
  return (
    <NextProvider Link={components?.Link} Image={components?.Image}>
      <BaseProvider {...props}>{props.children}</BaseProvider>
    </NextProvider>
  );
}
