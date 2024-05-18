import type { ReactElement } from 'react';
import type * as PageTree from '../server/page-tree';
import type { File, Folder, Storage } from './file-system';
import { resolvePath } from './path';
import { type FileData } from './types';

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
   * Build page tree and fallback to the default language if the localized page doesn't exist
   */
  buildI18n: (
    options?: Partial<BuildPageTreeOptionsWithI18n>,
  ) => Record<string, PageTree.Root>;
}

export interface CreatePageTreeBuilderOptions {
  storage: Storage;
  resolveIcon?: (icon: string) => ReactElement | undefined;
}

const link = /^\[(?<text>.+)]\((?<url>.+)\)$/;
const separator = /^---(?<name>.*?)---$/;
const rest = '...';
const extractor = /^\.\.\.(?<name>.+)$/;

/**
 * @param nodes - All nodes to be built
 * @param ctx - Context
 * @param skipIndex - Skip index
 * @returns Nodes with specified locale in context (sorted)
 */
function buildAll(
  nodes: (Folder | File)[],
  ctx: PageTreeBuilderContext,
  skipIndex: boolean,
): PageTree.Node[] {
  const output: PageTree.Node[] = [];

  for (const node of [...nodes].sort((a, b) =>
    a.file.name.localeCompare(b.file.name),
  )) {
    if ('data' in node && node.format === 'page' && !node.file.locale) {
      const treeNode = buildFileNode(node, ctx);

      if (node.file.name === 'index') {
        if (!skipIndex) output.unshift(treeNode);
        continue;
      }

      output.push(treeNode);
    }

    if ('children' in node) {
      output.push(buildFolderNode(node, false, ctx));
    }
  }

  return output;
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

  const linkResult = link.exec(item);
  if (linkResult?.groups) {
    const { url, text } = linkResult.groups;
    const isRelative =
      url.startsWith('/') || url.startsWith('#') || url.startsWith('.');
    return [
      {
        type: 'page',
        name: text,
        url,
        external: !isRelative,
      },
    ];
  }

  const extractResult = extractor.exec(item);

  const path = resolvePath(
    folder.file.path,
    extractResult?.groups?.name ?? item,
  );
  const itemNode = ctx.storage.readDir(path) ?? ctx.storage.read(path, 'page');

  if (!itemNode) return [];

  addedNodePaths.add(itemNode.file.path);

  if ('children' in itemNode) {
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
  const metaPath = resolvePath(folder.file.path, 'meta');
  let meta = ctx.storage.read(metaPath, 'meta');
  meta = findLocalizedFile(metaPath, 'meta', ctx) ?? meta;
  const indexFile = ctx.storage.read(
    resolvePath(folder.file.flattenedPath, 'index'),
    'page',
  );

  const metadata = meta?.data.data as FileData['meta']['data'] | undefined;
  const index = indexFile ? buildFileNode(indexFile, ctx) : undefined;

  let children: PageTree.Node[];

  if (!meta) {
    children = buildAll(folder.children, ctx, !defaultIsRoot);
  } else {
    const isRoot = metadata?.root ?? defaultIsRoot;
    const addedNodePaths = new Set<string>();

    const resolved = metadata?.pages?.flatMap<PageTree.Node | '...'>((item) => {
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

  return removeUndefined({
    type: 'folder',
    name: metadata?.title ?? index?.name ?? pathToName(folder.file.name),
    icon: ctx.resolveIcon(metadata?.icon),
    root: metadata?.root,
    defaultOpen: metadata?.defaultOpen,
    index,
    children,
  });
}

function buildFileNode(file: File, ctx: PageTreeBuilderContext): PageTree.Item {
  const localized =
    findLocalizedFile(file.file.flattenedPath, 'page', ctx) ?? file;
  const data = localized.data as FileData['file'];

  return removeUndefined({
    type: 'page',
    name: data.data.title,
    icon: ctx.resolveIcon(data.data.icon),
    url: data.url,
  });
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

function findLocalizedFile(
  path: string,
  format: 'meta' | 'page',
  ctx: PageTreeBuilderContext,
): File | undefined {
  if (!ctx.lang) return;

  return ctx.storage.read(`${path}.${ctx.lang}`, format);
}

function pathToName(path: string): string {
  return path.slice(0, 1).toUpperCase() + path.slice(1);
}

function removeUndefined<T extends object>(value: T): T {
  const obj = value as Record<string, unknown>;
  Object.keys(obj).forEach((key) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Remove undefined values
    if (obj[key] === undefined) delete obj[key];
  });

  return value;
}
