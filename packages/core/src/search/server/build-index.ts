import type { LoaderConfig, LoaderOutput, Page } from '@/source';
import type { StructuredData } from '@/mdx-plugins/remark-structure';
import { basename, extname } from '@/source/path';
import { findPath } from '@/page-tree/utils';

export interface SharedIndex {
  id: string;
  title: string;
  description?: string;
  breadcrumbs?: string[];

  /**
   * Required if tag filter is enabled
   */
  tag?: string | string[];

  /**
   * preprocess mdx content with `structure`
   */
  structuredData: StructuredData;
  url: string;
}

export async function buildIndexDefault(page: Page): Promise<SharedIndex> {
  let structuredData: StructuredData | undefined;

  if ('structuredData' in page.data) {
    structuredData =
      typeof page.data.structuredData === 'function'
        ? ((await page.data.structuredData()) as StructuredData)
        : (page.data.structuredData as StructuredData);
  } else if ('load' in page.data && typeof page.data.load === 'function') {
    structuredData = (await page.data.load()).structuredData;
  }

  if (!structuredData)
    throw new Error(
      'Cannot find structured data from page, please define the page to index function.',
    );

  return {
    title: page.data.title ?? basename(page.path, extname(page.path)),
    description: page.data.description,
    url: page.url,
    id: page.url,
    structuredData,
  };
}

function isBreadcrumbItem(item: unknown): item is string {
  return typeof item === 'string' && item.length > 0;
}

export function buildBreadcrumbs<C extends LoaderConfig>(
  source: LoaderOutput<C>,
  page: Page<C['source']['pageData']>,
): string[] | undefined {
  const pageTree = source.getPageTree(page.locale);
  const path = findPath(pageTree.children, (node) => node.type === 'page' && node.url === page.url);

  if (path) {
    const breadcrumbs: string[] = [];
    path.pop();

    if (isBreadcrumbItem(pageTree.name)) {
      breadcrumbs.push(pageTree.name);
    }

    for (const segment of path) {
      if (!isBreadcrumbItem(segment.name)) continue;
      breadcrumbs.push(segment.name);
    }

    return breadcrumbs;
  }
}
