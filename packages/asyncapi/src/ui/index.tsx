'use client';
import type { FC } from 'react';
import { Schema } from 'shared-api/components/schema';
import {
  type AsyncAPIPageProps,
  type AsyncAPIPageProps_Preloaded,
  type AsyncAPIPageProps_Spec,
  type AsyncAPIRenderOptions,
  type AsyncAPIRuntimeOptions,
  createAsyncAPIRenderer,
  type CreateAsyncAPIRendererOptions,
  type PageLayoutProps,
} from '@/utils/create-page';
import { Operation } from '@/ui/operation';

export type { AsyncAPIPageProps, AsyncAPIPageProps_Spec, AsyncAPIPageProps_Preloaded };

export interface CreateAsyncAPIPageOptions extends AsyncAPIRuntimeOptions, AsyncAPIRenderOptions {
  /**
   * Replace parts of the UI, e.g. the ones installed with Fumadocs CLI.
   */
  components?: Partial<CreateAsyncAPIRendererOptions['components']>;
}

/**
 * Create `<AsyncAPIPage />` (a client component).
 */
export function createAsyncAPIPage(options: CreateAsyncAPIPageOptions = {}): FC<AsyncAPIPageProps> {
  return createAsyncAPIRenderer({
    ...options,
    components: { SchemaUI: Schema, Operation, Layout, ...options.components },
  });
}

function Layout({ operations }: PageLayoutProps) {
  return (
    <div className="flex flex-col gap-24 text-sm @container">
      {operations?.map((item) => item.children)}
    </div>
  );
}
