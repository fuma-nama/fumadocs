'use client';
import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from 'fumadocs-ui/components/api';
import dynamic from 'next/dynamic';
import { ApiProvider } from '@/ui/contexts/api';
import { type RootProps } from '@/render/renderer';
import type { RenderContext } from '@/types';

export const APIPlayground = dynamic(() =>
  import('./playground').then((mod) => mod.APIPlayground),
);

export function Root({
  children,
  baseUrl,
  className,
  shikiOptions,
  servers,
  ...props
}: RootProps & {
  shikiOptions: RenderContext['shikiOptions'];
} & HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div
      className={cn(
        'flex flex-col gap-24 text-sm text-fd-muted-foreground',
        className,
      )}
      {...props}
    >
      <ApiProvider
        servers={servers}
        shikiOptions={shikiOptions}
        defaultBaseUrl={baseUrl}
      >
        {children}
      </ApiProvider>
    </div>
  );
}

export { useSchemaContext } from './contexts/schema';
