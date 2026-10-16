import type { LoaderConfig, LoaderOutput, Page } from '@/source';
import type { Awaitable } from '@/types';
import type { StructuredData } from '@/mdx-plugins/remark-structure';
import { basename, extname } from '@/source/path';
import type * as PageTree from '@/page-tree';

export interface SharedIndex {
  id: string;
  title: string;
  description?: string;
  breadcrumbs?: string[];

  /**
   * Locale of content (for i18n)
   */
  locale?: string;

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

  if (page.data.structuredData) {
    structuredData =
      typeof page.data.structuredData === 'function'
        ? await page.data.structuredData()
        : page.data.structuredData;
    // TODO: remove on next major
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

/**
 * Build a search index for every page, in parallel.
 */
export async function buildDocuments<C extends LoaderConfig, T>(
  source: LoaderOutput<C> | (() => Awaitable<LoaderOutput<C>>),
  map: (index: SharedIndex, page: C['page']) => T,
): Promise<T[]> {
  const loader = typeof source === 'function' ? await source() : source;
  const tasks: Promise<T>[] = [];
  for (const page of loader.getPages()) tasks.push(build(page));

  async function build(page: C['page']) {
    return map(await buildIndexDefault(page), page);
  }

  return Promise.all(tasks);
}

function isBreadcrumbItem(item: unknown): item is string {
  return typeof item === 'string' && item.length > 0;
}

/**
 * Get the breadcrumbs of pages, each page tree is walked once.
 */
export function createBreadcrumbs<C extends LoaderConfig>(
  source: LoaderOutput<C>,
): (page: C['page']) => string[] | undefined {
  const trees = new Map<PageTree.Root, Map<string, string[]>>();

  return (page) => {
    const tree = source.getPageTree(page.locale);
    let breadcrumbs = trees.get(tree);
    if (!breadcrumbs) trees.set(tree, (breadcrumbs = collectBreadcrumbs(tree, [], new Map())));
    return breadcrumbs.get(page.url);
  };
}

/** like `findPath()`, a page takes its first path, with the separator above it */
function collectBreadcrumbs(
  folder: PageTree.Root | PageTree.Folder,
  parents: string[],
  out: Map<string, string[]>,
): Map<string, string[]> {
  const path = isBreadcrumbItem(folder.name) ? [...parents, folder.name] : parents;
  if (folder.type === 'folder' && folder.index && !out.has(folder.index.url))
    out.set(folder.index.url, path);

  let current = path;
  for (const node of folder.children) {
    if (node.type === 'separator')
      current = isBreadcrumbItem(node.name) ? [...path, node.name] : path;
    else if (node.type === 'folder') collectBreadcrumbs(node, current, out);
    else if (!out.has(node.url)) out.set(node.url, current);
  }
  return out;
}
