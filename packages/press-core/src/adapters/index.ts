import type { AppContext } from '@/lib/shared';
import type { Awaitable } from '@/lib/types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { Page } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactNode } from 'react';

/** allow content sources to implement interfaces for pages, instead of requiring consumers to specify manually */
export interface Adapter {
  'core:get-llms-text'?: (this: AppContext, page: Page) => Awaitable<string | undefined>;
  'core:get-structured-data'?: (
    this: AppContext,
    page: Page,
  ) => Awaitable<StructuredData | undefined>;
  'core:render-body'?: (this: AppContext, page: Page) => Awaitable<ReactNode>;
  'core:render-toc'?: (this: AppContext, page: Page) => Awaitable<TOCItemType[] | undefined>;
}
