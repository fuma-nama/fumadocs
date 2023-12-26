import type { ReactElement } from 'react';
import type * as PageTree from '../server/types';
import type * as FileGraph from './file-graph';

interface PageTreeBuilderContext {
  storage: FileGraph.Storage;
  lang?: string;

  resolveIcon: (icon: string | undefined) => ReactElement | undefined;
}

export interface BuildPageTreeOptionsWithI18n {
  languages: string[];
}

export interface PageTreeBuilder {
  build: () => PageTree.PageTree;

  /**
   * Build page tree and fallback to the default language if the page doesn't exist
   */
  buildI18n: (
    options?: Partial<BuildPageTreeOptionsWithI18n>,
  ) => Record<string, PageTree.PageTree>;
}

export interface CreatePageTreeBuilderOptions {
  storage: FileGraph.Storage;
  resolveIcon?: (icon: string) => ReactElement | undefined;
}

const separator = /---(?<name>.*?)---/;
const rest = '...';
const extractor = /\.\.\.(?<name>.+)/;

/**
 * @param skipIndex - Skip index
 * @returns Nodes with specified locale in context (sorted)
 */
function buildAll(
  nodes: FileGraph.Node[],
  ctx: PageTreeBuilderContext,
  skipIndex: boolean,
): PageTree.TreeNode[] {
  return nodes
    .flatMap((child) => {
      if (child.type === 'page') {
        if (child.file.locale) return [];
        if (skipIndex && child.file.name === 'index') return [];

        return buildFileNode(child, ctx);
      }

      if (child.type === 'folder') {
        return buildFolderNode(child, ctx, true);
      }

      return [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getFolderMeta(
  folder: FileGraph.Folder,
  ctx: PageTreeBuilderContext,
): FileGraph.Meta | undefined {
  const meta = ctx.storage.read(
    ctx.lang
      ? `${folder.file.path}/meta.${ctx.lang}.json`
      : `${folder.file.path}/meta.json`,
  );

  if (meta?.type === 'meta') return meta;
}

/**
 *
 * @param folder - Folder node
 * @param ctx - Context
 * @param skipIndex - Exclude index page if meta not specified
 */
function buildFolderNode(
  folder: FileGraph.Folder,
  ctx: PageTreeBuilderContext,
  skipIndex = false,
): PageTree.FolderNode {
  const indexNode = folder.children.find(
    (node) => node.type === 'page' && node.file.name === 'index',
  ) as FileGraph.Page | undefined;
  const index = indexNode ? buildFileNode(indexNode, ctx) : undefined;
  const meta = getFolderMeta(folder, ctx)?.data;

  let children: PageTree.FolderNode['children'];

  if (!meta) {
    children = buildAll(folder.children, ctx, skipIndex);
  } else {
    const addedNodePaths = new Set<string>();

    const resolved = meta.pages.flatMap<PageTree.TreeNode | '...'>((item) => {
      if (item === rest) return '...';

      const result = separator.exec(item);

      if (result?.groups) {
        return {
          type: 'separator',
          name: result.groups.name,
        };
      }

      const extractResult = extractor.exec(item);

      const extractName = extractResult?.groups?.name ?? item;

      const itemNode =
        ctx.storage.readDir(`${folder.file.path}/${extractName}`) ??
        ctx.storage.read(`${folder.file.path}/${extractName}.mdx`) ??
        ctx.storage.read(`${folder.file.path}/${extractName}.md`);

      if (!itemNode) return [];

      addedNodePaths.add(itemNode.file.path);

      if (itemNode.type === 'folder') {
        const node = buildFolderNode(itemNode, ctx);

        return extractResult?.groups ? node.children : node;
      }

      if (itemNode.type === 'page') {
        return buildFileNode(itemNode, ctx);
      }

      return [];
    });

    children = resolved.flatMap<PageTree.TreeNode>((item) => {
      if (item === '...') {
        return buildAll(
          folder.children.filter((node) => !addedNodePaths.has(node.file.path)),
          ctx,
          true,
        );
      }

      return item;
    });
  }

  return {
    type: 'folder',
    name: meta?.title ?? index?.name ?? pathToName(folder.file.name),
    icon: ctx.resolveIcon(meta?.icon),
    index,
    children,
  };
}

function buildFileNode(
  page: FileGraph.Page,
  ctx: PageTreeBuilderContext,
): PageTree.FileNode {
  let localePage = page;
  if (ctx.lang) {
    const result =
      ctx.storage.read(`${page.file.flattenedPath}.${ctx.lang}.mdx`) ??
      ctx.storage.read(`${page.file.flattenedPath}.${ctx.lang}.md`);

    if (result?.type === 'page') localePage = result;
  }

  return {
    type: 'page',
    name: localePage.data.title,
    icon: ctx.resolveIcon(localePage.data.icon),
    url: localePage.url,
  };
}

function build(ctx: PageTreeBuilderContext): PageTree.PageTree {
  const root = ctx.storage.root();
  const folder = buildFolderNode(root, ctx, true);

  return {
    name: folder.name,
    children: folder.children,
  };
}

export function createPageTreeBuilder({
  storage,
  resolveIcon = () => undefined,
}: CreatePageTreeBuilderOptions): PageTreeBuilder {
  const context: PageTreeBuilderContext = {
    storage,
    resolveIcon(icon) {
      if (!icon) return;
      return resolveIcon(icon);
    },
  };

  return {
    build() {
      return build(context);
    },
    buildI18n({ languages = [] } = {}) {
      const entries = languages.map<[string, PageTree.PageTree]>((lang) => {
        const tree = build({
          ...context,
          lang,
        });

        return [lang, tree];
      });

      return Object.fromEntries(entries);
    },
  };
}

function pathToName(path: string): string {
  return path.slice(0, 1).toUpperCase() + path.slice(1);
}
