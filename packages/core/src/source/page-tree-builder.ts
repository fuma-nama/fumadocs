import type { ReactElement } from 'react';
import type * as PageTree from '../server/page-tree';
import type { Folder, Meta, Page, Storage } from './file-system';
import { joinPaths } from './path';

interface PageTreeBuilderContext {
  storage: Storage;
  lang?: string;

  builder: PageTreeBuilder;
  resolveIcon: (icon: string | undefined) => ReactElement | undefined;
}

export interface BuildPageTreeOptionsWithI18n {
  languages: string[];
}

export interface PageTreeBuilder {
  build: () => PageTree.Root;

  /**
   * Build page tree and fallback to the default language if the page doesn't exist
   */
  buildI18n: (
    options?: Partial<BuildPageTreeOptionsWithI18n>,
  ) => Record<string, PageTree.Root>;
}

export interface CreatePageTreeBuilderOptions {
  storage: Storage;
  resolveIcon?: (icon: string) => ReactElement | undefined;
}

const external = /\[(?<text>.+)\]\((?<url>.+)\)/;
const separator = /---(?<name>.*?)---/;
const rest = '...';
const extractor = /\.\.\.(?<name>.+)/;

/**
 * @param skipIndex - Skip index
 * @returns Nodes with specified locale in context (sorted)
 */
function buildAll(
  nodes: (Folder | Page | Meta)[],
  ctx: PageTreeBuilderContext,
  skipIndex: boolean,
): PageTree.Node[] {
  const output: PageTree.Node[] = [];

  for (const node of [...nodes].sort((a, b) =>
    a.file.name.localeCompare(b.file.name),
  )) {
    if (node.type === 'page') {
      if (node.file.locale) continue;
      const treeNode = buildFileNode(node, ctx);

      if (node.file.name === 'index') {
        if (!skipIndex) output.unshift(treeNode);
        continue;
      }

      output.push(treeNode);
    }

    if (node.type === 'folder') {
      output.push(buildFolderNode(node, false, ctx));
    }
  }

  return output;
}

function getFolderMeta(
  folder: Folder,
  ctx: PageTreeBuilderContext,
): Meta | undefined {
  let meta = ctx.storage.readMeta(joinPaths([folder.file.path, 'meta']));

  if (ctx.lang) {
    meta =
      ctx.storage.readMeta(joinPaths([folder.file.path, `meta.${ctx.lang}`])) ??
      meta;
  }

  return meta;
}

function resolveFolderItem(
  folder: Folder,
  item: string,
  ctx: PageTreeBuilderContext,
  addedNodePaths: Set<string>,
): PageTree.Node[] | '...' {
  if (item === rest) return '...';

  const separateResult = separator.exec(item);
  if (separateResult?.groups) {
    return [
      {
        type: 'separator',
        name: separateResult.groups.name,
      },
    ];
  }

  const externalResult = external.exec(item);
  if (externalResult?.groups) {
    return [
      {
        type: 'page',
        name: externalResult.groups.text,
        url: externalResult.groups.url,
        external: true,
      },
    ];
  }

  const extractResult = extractor.exec(item);

  const path = joinPaths([
    folder.file.path,
    extractResult?.groups?.name ?? item,
  ]);
  const itemNode = ctx.storage.readDir(path) ?? ctx.storage.readPage(path);

  if (!itemNode) return [];

  addedNodePaths.add(itemNode.file.path);

  if (itemNode.type === 'folder') {
    const node = buildFolderNode(itemNode, false, ctx);

    return extractResult ? node.children : [node];
  }

  return [buildFileNode(itemNode, ctx)];
}

function buildFolderNode(
  folder: Folder,
  defaultIsRoot: boolean,
  ctx: PageTreeBuilderContext,
): PageTree.Folder {
  const indexFile = ctx.storage.readPage(
    joinPaths([folder.file.flattenedPath, 'index']),
  );

  const index = indexFile ? buildFileNode(indexFile, ctx) : undefined;
  const meta = getFolderMeta(folder, ctx)?.data;

  let children: PageTree.Node[];

  if (!meta) {
    children = buildAll(folder.children, ctx, !defaultIsRoot);
  } else {
    const isRoot = meta.root ?? defaultIsRoot;
    const addedNodePaths = new Set<string>();

    const resolved = meta.pages?.flatMap<PageTree.Node | '...'>((item) => {
      return resolveFolderItem(folder, item, ctx, addedNodePaths);
    });

    const restNodes = buildAll(
      folder.children.filter((node) => !addedNodePaths.has(node.file.path)),
      ctx,
      !isRoot,
    );

    const nodes = resolved?.flatMap<PageTree.Node>((item) => {
      if (item === '...') {
        return restNodes;
      }

      return item;
    });

    children = nodes ?? restNodes;
  }

  return {
    type: 'folder',
    name: meta?.title ?? index?.name ?? pathToName(folder.file.name),
    icon: ctx.resolveIcon(meta?.icon),
    root: meta?.root,
    defaultOpen: meta?.defaultOpen,
    index,
    children,
  };
}

function buildFileNode(page: Page, ctx: PageTreeBuilderContext): PageTree.Item {
  let localePage = page;
  if (ctx.lang) {
    const result = ctx.storage.readPage(
      `${page.file.flattenedPath}.${ctx.lang}`,
    );

    if (result) localePage = result;
  }

  return {
    type: 'page',
    name: localePage.data.title,
    icon: ctx.resolveIcon(localePage.data.icon),
    url: localePage.url,
  };
}

function build(ctx: PageTreeBuilderContext): PageTree.Root {
  const root = ctx.storage.root();
  const folder = buildFolderNode(root, true, ctx);

  return {
    name: folder.name,
    children: folder.children,
  };
}

export function createPageTreeBuilder({
  storage,
  resolveIcon = () => undefined,
}: CreatePageTreeBuilderOptions): PageTreeBuilder {
  function getContext(
    builder: PageTreeBuilder,
    locale?: string,
  ): PageTreeBuilderContext {
    return {
      storage,
      lang: locale,
      resolveIcon(icon) {
        if (!icon) return;
        return resolveIcon(icon);
      },
      builder,
    };
  }

  return {
    build() {
      return build(getContext(this));
    },
    buildI18n({ languages = [] } = {}) {
      const entries = languages.map<[string, PageTree.Root]>((lang) => {
        const tree = build(getContext(this, lang));

        return [lang, tree];
      });

      return Object.fromEntries(entries);
    },
  };
}

function pathToName(path: string): string {
  return path.slice(0, 1).toUpperCase() + path.slice(1);
}
