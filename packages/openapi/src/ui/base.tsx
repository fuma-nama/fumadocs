'use client';
import type { FC } from 'react';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { Schema } from 'shared-api/components/schema';
import { createOpenAPIRenderer, type PageLayoutProps } from '@/utils/create-page';
import { Operation } from '@/ui/operation';
import type { CreateOpenAPIPageOptions, OpenAPIPageProps } from '.';

/**
 * Create `<OpenAPIPage />` (a client component) without the full Shiki bundle.
 */
export function createOpenAPIPageBase(
  options: CreateOpenAPIPageOptions & { shiki: ShikiFactory },
): FC<OpenAPIPageProps> {
  return createOpenAPIRenderer({
    ...options,
    components: { SchemaUI: Schema, Operation, Layout, ...options.components },
  });
}

function Layout({ operations, webhooks }: PageLayoutProps) {
  return (
    <div className="flex flex-col gap-24 text-sm @container">
      {operations?.map((item) => item.children)}
      {webhooks?.map((item) => item.children)}
    </div>
  );
}
