import type { ReactElement } from 'react';
import type { FileNode, FolderNode, PageTree, TreeNode } from '../server/types';
import { joinPaths, splitPath } from '../server/utils';
import type { Meta, Page } from './types';

interface PageTreeBuilderContext {
  lang?: string;

  getMetaByPath: (flattenPath: string) => Meta | undefined;
  getPageByPath: (flattenPath: string) => Page | undefined;

  resolveIcon: (icon: string | undefined) => ReactElement | undefined;

  /**
   * Default pages without specified langauge
   */
  basePages: Page[];
}

export interface BuildPageTreeOptions {
  /**
   * The root folder to scan files
   * @defaultValue `''`
   */
  root: string;
}

export type BuildPageTreeOptionsWithI18n = BuildPageTreeOptions & {
  languages: string[];
};

export interface PageTreeBuilder {
  build: (options?: Partial<BuildPageTreeOptions>) => PageTree;

  /**
   * Build page tree and fallback to the default language if the page doesn't exist
   */
  buildI18n: (
    options?: Partial<BuildPageTreeOptionsWithI18n>,
  ) => Record<string, PageTree>;
}

export interface CreatePageTreeBuilderOptions {
  pages: Page[];
  metas: Meta[];
  resolveIcon?: (icon: string) => ReactElement | undefined;
}

const separator = /---(?<name>.*?)---/;
const rest = '...';
const extractor = /\.\.\.(?<name>.+)/;

function buildMeta(meta: Meta, ctx: PageTreeBuilderContext): FolderNode {
  let index: FileNode | undefined;
  const filtered = new Set<string>();

  const resolved = meta.pages.flatMap<TreeNode | '...'>((_item) => {
    let item = _item;
    if (item === rest) return '...';

    const result = separator.exec(item);

    if (result?.groups) {
      return {
        type: 'separator',
        name: result.groups.name,
      };
    }

    const extractResult = extractor.exec(item);
    const isExtract = extractResult !== null;

    if (extractResult?.groups) {
      item = extractResult.groups.name;
    }

    const path = joinPaths([meta.file.dirname, item]);
    const page = ctx.getPageByPath(path);

    if (page) {
      const node = buildFileNode(page, ctx);
      filtered.add(page.file.path);

      if (item === 'index') index = node;
      return node;
    }

    //folder can't be index
    if (item === 'index') {
      return [];
    }

    const node = buildFolderNode(path, ctx, isExtract);
    filtered.add(path);

    // if item doesn't exist
    if (!node.index && node.children.length === 0) return [];

    // extract children
    if (isExtract) return node.children;

    return node;
  });

  const children = resolved.flatMap<TreeNode>((item) => {
    if (item === '...') {
      return getFolderNodes(
        ctx,
        meta.file.dirname,
        false,
        (path) => !filtered.has(path),
      ).children;
    }

    return item;
  });

  if (!index) {
    const page = ctx.getPageByPath(joinPaths([meta.file.dirname, 'index']));

    if (page) index = buildFileNode(page, ctx);
  }

  return {
    type: 'folder',
    name: meta.title ?? index?.name ?? pathToName(splitPath(meta.file.dirname)),
    icon: ctx.resolveIcon(meta.icon),
    index,
    children,
  };
}

/**
 * Get nodes under specific folder
 * @param ctx - Context
 * @param path - Folder path
 * @param joinIndex - If enabled, join index node into children
 * @param filter - Filter nodes
 */
function getFolderNodes(
  ctx: PageTreeBuilderContext,
  path: string,
  joinIndex: boolean,
  filter: (path: string) => boolean = () => true,
): { index?: FileNode; children: TreeNode[] } {
  let index: FileNode | undefined;
  const children: TreeNode[] = [];

  for (const page of ctx.basePages) {
    if (page.file.dirname !== path || !filter(page.file.path)) continue;
    const node = buildFileNode(page, ctx);

    if (page.file.name === 'index') {
      index = node;
      continue;
    }

    children.push(node);
  }

  const segments = splitPath(path);
  const folders = new Set<string>(
    ctx.basePages.flatMap((page) => {
      const dirnameSegments = splitPath(page.file.dirname);

      if (path.length === 0 && path !== page.file.dirname)
        return dirnameSegments[0];
      if (page.file.dirname.startsWith(`${path}/`))
        return joinPaths([path, dirnameSegments[segments.length]]);

      return [];
    }),
  );

  for (const folder of folders) {
    if (!filter(folder)) continue;

    children.push(buildFolderNode(folder, ctx));
  }

  children.sort((next, prev) => next.name.localeCompare(prev.name));
  if (index && joinIndex) children.unshift(index);

  return { index, children };
}

function buildFileNode(page: Page, ctx: PageTreeBuilderContext): FileNode {
  let localePage = page;
  if (ctx.lang) {
    localePage =
      ctx.getPageByPath(`${page.file.flattenedPath}.${ctx.lang}`) ?? page;
  }

  return {
    type: 'page',
    name: localePage.title,
    icon: ctx.resolveIcon(localePage.icon),
    url: localePage.url,
  };
}

function buildFolderNode(
  path: string,
  ctx: PageTreeBuilderContext,
  keepIndex = false,
): FolderNode {
  let meta: Meta | undefined;

  if (ctx.lang) meta = ctx.getMetaByPath(joinPaths([path, `meta-${ctx.lang}`]));
  meta ??= ctx.getMetaByPath(joinPaths([path, 'meta']));

  if (meta) {
    return buildMeta(meta, ctx);
  }

  const { index, children } = getFolderNodes(ctx, path, keepIndex);

  return {
    type: 'folder',
    name: index?.name ?? pathToName(splitPath(path)),
    index,
    children,
  };
}

function build(root: string, ctx: PageTreeBuilderContext): PageTree {
  const folder = buildFolderNode(root, ctx, true);

  return {
    name: folder.name,
    children: folder.children,
  };
}

export function createPageTreeBuilder({
  metas,
  pages,
  resolveIcon = () => undefined,
}: CreatePageTreeBuilderOptions): PageTreeBuilder {
  const basePages: Page[] = [];
  const pageMap = new Map<string, Page>();
  const metaMap = new Map<string, Meta>();

  for (const page of pages) {
    if (!page.file.locale) basePages.push(page);
    pageMap.set(page.file.flattenedPath, page);
  }

  for (const meta of metas) {
    metaMap.set(meta.file.flattenedPath, meta);
  }

  const context: PageTreeBuilderContext = {
    basePages,
    getMetaByPath: (path) => metaMap.get(path),
    getPageByPath: (path) => pageMap.get(path),
    resolveIcon(icon) {
      if (!icon) return;
      return resolveIcon(icon);
    },
  };

  return {
    build({ root = '' } = {}) {
      return build(root, context);
    },
    buildI18n({ root = '', languages = [] } = {}) {
      const entries = languages.map<[string, PageTree]>((lang) => {
        const tree = build(root, {
          ...context,
          lang,
        });

        return [lang, tree];
      });

      return Object.fromEntries(entries);
    },
  };
}

function pathToName(path: string[]): string {
  const name = path[path.length - 1] ?? 'docs';
  return name.slice(0, 1).toUpperCase() + name.slice(1);
}
