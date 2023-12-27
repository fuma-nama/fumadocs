import type { ReactElement } from 'react';
import type * as PageTree from '../server/page-tree';
import type * as FileGraph from './file-graph';
import { joinPaths } from './path';

interface PageTreeBuilderContext {
  storage: FileGraph.Storage;
  lang?: string;

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
): PageTree.Node[] {
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
  let meta = ctx.storage.read(joinPaths([folder.file.path, 'meta']));

  if (ctx.lang) {
    meta =
      ctx.storage.read(joinPaths([folder.file.path, `meta.${ctx.lang}`])) ??
      meta;
  }

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
): PageTree.Folder {
  const indexNode = folder.children.find(
    (node) => node.type === 'page' && node.file.name === 'index',
  ) as FileGraph.Page | undefined;
  const index = indexNode ? buildFileNode(indexNode, ctx) : undefined;
  const meta = getFolderMeta(folder, ctx)?.data;

  let children: PageTree.Folder['children'];

  if (!meta?.pages) {
    children = buildAll(folder.children, ctx, skipIndex);
  } else {
    const addedNodePaths = new Set<string>();

    const resolved = meta.pages.flatMap<PageTree.Node | '...'>((item) => {
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
        ctx.storage.readDir(joinPaths([folder.file.path, extractName])) ??
        ctx.storage.read(joinPaths([folder.file.path, extractName]));

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

    children = resolved.flatMap<PageTree.Node>((item) => {
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
    root: meta?.root,
    index,
    children,
  };
}

function buildFileNode(
  page: FileGraph.Page,
  ctx: PageTreeBuilderContext,
): PageTree.Item {
  let localePage = page;
  if (ctx.lang) {
    const result = ctx.storage.read(`${page.file.flattenedPath}.${ctx.lang}`);

    if (result?.type === 'page') localePage = result;
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
      const entries = languages.map<[string, PageTree.Root]>((lang) => {
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
