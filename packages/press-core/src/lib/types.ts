import type { AppContext } from '@/lib/shared';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { Page } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactNode } from 'react';
import type { createPages } from 'waku';

export type Awaitable<T> = T | Promise<T>;

/** allow content sources to implement interfaces for pages, instead of requiring consumers to specify manually */
export interface Adapter {
  'core:get-text'?: (this: AppContext, page: Page) => Awaitable<string | undefined>;
  'core:get-structured-data'?: (
    this: AppContext,
    page: Page,
  ) => Awaitable<StructuredData | undefined>;
  'core:render-body'?: (this: AppContext, page: Page) => Awaitable<ReactNode>;
  'core:render-toc'?: (this: AppContext, page: Page) => Awaitable<TOCItemType[] | undefined>;
}

export interface ServerPlugin {
  /** receive & modify context */
  init?: (this: AppContext) => void;

  createPages?: (this: AppContext, fns: RouteFns) => Awaitable<void>;
}

export type RouteFns = Parameters<Parameters<typeof createPages>[0]>[0] & {
  createApiIsomorphic: (config: {
    render: 'static' | 'dynamic';
    path: string;
    staticPaths?: string[][];
    handler: (
      req: Request,
      ctx: { params: Record<string, string | string[]> },
    ) => Promise<Response>;
  }) => void;
};
