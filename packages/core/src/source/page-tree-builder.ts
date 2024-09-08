import type { ReactElement } from 'react';
import type { I18nConfig } from '@/i18n';
import type * as PageTree from '../server/page-tree';
import type { File, Folder, MetaFile, PageFile, Storage } from './file-system';
import { resolvePath } from './path';
import { type UrlFn } from './types';

interface PageTreeBuilderContext {
  lang?: string;

  storage: Storage;
  builder: PageTreeBuilder;
  options: BuildPageTreeOptions;

  i18n?: I18nConfig;
}

export interface BuildPageTreeOptions {
  /**
   * Attach the `folder.id` property
   *
   * @defaultValue false
   */
  attachFolderIds?: boolean;

  // TODO: Rename to `attachPage` (major)
  attachFile?: (node: PageTree.Item, file?: PageFile) => PageTree.Item;
  attachFolder?: (
    node: PageTree.Folder,
    folder: Folder,
    meta?: MetaFile,
  ) => PageTree.Folder;
  attachSeparator?: (node: PageTree.Separator) => PageTree.Separator;

  storage: Storage;
  getUrl: UrlFn;
  resolveIcon?: (icon: string | undefined) => ReactElement | undefined;
}

export interface BuildPageTreeOptionsWithI18n extends BuildPageTreeOptions {
  i18n: I18nConfig;
}

export interface PageTreeBuilder {
  build: (options: BuildPageTreeOptions) => PageTree.Root;

  /**
   * Build page tree and fallback to the default language if the localized page doesn't exist
   */
  buildI18n: (
    options: BuildPageTreeOptionsWithI18n,
  ) => Record<string, PageTree.Root>;
}

const group = /^\((?<name>.+)\)$/;
const link = /^(?:\[(?<icon>[^\]]+)])?\[(?<name>[^\]]+)]\((?<url>[^)]+)\)$/;
const separator = /^---(?<name>.*?)---$/;
const rest = '...';
const extractPrefix = '...';
const excludePrefix = '!';

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
  const folders: PageTree.Folder[] = [];

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
      folders.push(buildFolderNode(node, false, ctx));
    }
  }

  output.push(...folders);
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
    const node: PageTree.Separator = {
      type: 'separator',
      name: separateResult.groups.name,
    };

    return [ctx.options.attachSeparator?.(node) ?? node];
  }

  const linkResult = link.exec(item);
  if (linkResult?.groups) {
    const { icon, url, name } = linkResult.groups;
    const isRelative =
      url.startsWith('/') || url.startsWith('#') || url.startsWith('.');

    const node: PageTree.Item = {
      type: 'page',
      icon: ctx.options.resolveIcon?.(icon),
      name,
      url,
      external: !isRelative,
    };

    return [removeUndefined(ctx.options.attachFile?.(node) ?? node)];
  }

  const isExcept = item.startsWith(excludePrefix),
    isExtract = item.startsWith(extractPrefix);

  let filename = item;
  if (isExcept) {
    filename = item.slice(excludePrefix.length);
  } else if (isExtract) {
    filename = item.slice(extractPrefix.length);
  }

  const path = resolvePath(folder.file.path, filename);

  const itemNode = ctx.storage.readDir(path) ?? ctx.storage.read(path, 'page');
  if (!itemNode) return [];

  addedNodePaths.add(itemNode.file.path);
  if (isExcept) return [];

  if ('children' in itemNode) {
    const node = buildFolderNode(itemNode, false, ctx);

    return isExtract ? node.children : [node];
  }

  return [buildFileNode(itemNode, ctx)];
}

function buildFolderNode(
  folder: Folder,
  isGlobalRoot: boolean,
  ctx: PageTreeBuilderContext,
): PageTree.Folder {
  const metaPath = resolvePath(folder.file.path, 'meta');
  let meta = ctx.storage.read(metaPath, 'meta');
  meta = findLocalizedFile(metaPath, 'meta', ctx) ?? meta;
  const indexFile = ctx.storage.read(
    resolvePath(folder.file.flattenedPath, 'index'),
    'page',
  );

  const metadata = meta?.data.data;
  const index = indexFile ? buildFileNode(indexFile, ctx) : undefined;

  let children: PageTree.Node[];

  if (!meta) {
    children = buildAll(folder.children, ctx, !isGlobalRoot);
  } else {
    const isRoot = metadata?.root ?? isGlobalRoot;
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

  const node: PageTree.Folder = {
    type: 'folder',
    name: metadata?.title ?? index?.name ?? pathToName(folder.file.name, true),
    icon: ctx.options.resolveIcon?.(metadata?.icon) ?? index?.icon,
    root: metadata?.root,
    defaultOpen: metadata?.defaultOpen,
    index,
    children,
  };

  if (ctx.options.attachFolderIds) {
    node.id = folder.file.flattenedPath;
  }

  return removeUndefined(
    ctx.options.attachFolder?.(node, folder, meta) ?? node,
  );
}

function buildFileNode(
  file: PageFile,
  ctx: PageTreeBuilderContext,
): PageTree.Item {
  let urlLocale: string | undefined;
  const localized =
    findLocalizedFile(file.file.flattenedPath, 'page', ctx) ?? file;

  const hideLocale = ctx.i18n?.hideLocale ?? 'never';
  if (hideLocale === 'never') {
    urlLocale = ctx.lang;
  } else if (
    hideLocale === 'default-locale' &&
    ctx.lang !== ctx.i18n?.defaultLanguage
  ) {
    urlLocale = ctx.lang;
  }

  const item: PageTree.Item = {
    type: 'page',
    name: localized.data.data.title,
    icon: ctx.options.resolveIcon?.(localized.data.data.icon),
    url: ctx.options.getUrl(localized.data.slugs, urlLocale),
  };

  return removeUndefined(ctx.options.attachFile?.(item, file) ?? item);
}

function build(ctx: PageTreeBuilderContext): PageTree.Root {
  const root = ctx.storage.root();
  const folder = buildFolderNode(root, true, ctx);

  return {
    name: folder.name,
    children: folder.children,
  };
}

export function createPageTreeBuilder(): PageTreeBuilder {
  return {
    build(options) {
      return build({
        options,
        builder: this,
        storage: options.storage,
      });
    },
    buildI18n({ i18n, ...options }) {
      const entries = i18n.languages.map<[string, PageTree.Root]>((lang) => {
        const tree = build({
          lang,
          options,
          builder: this,
          storage: options.storage,
          i18n,
        });

        return [lang, tree];
      });

      return Object.fromEntries(entries);
    },
  };
}

function findLocalizedFile<F extends File['format']>(
  path: string,
  format: F,
  ctx: PageTreeBuilderContext,
): Extract<File, { format: F }> | undefined {
  if (!ctx.lang) return;

  return ctx.storage.read(`${path}.${ctx.lang}`, format);
}

/**
 * Get item name from file name
 *
 * @param name - file name
 * @param resolveGroup - resolve folder groups like (group_name)
 */
function pathToName(name: string, resolveGroup = false): string {
  const resolved = resolveGroup ? (group.exec(name)?.[1] ?? name) : name;

  const result = [];
  for (const c of resolved) {
    if (result.length === 0) result.push(c.toLocaleUpperCase());
    else if (c === '-') result.push(' ');
    else result.push(c);
  }

  return result.join('');
}

function removeUndefined<T extends object>(value: T): T {
  const obj = value as Record<string, unknown>;
  Object.keys(obj).forEach((key) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Remove undefined values
    if (obj[key] === undefined) delete obj[key];
  });

  return value;
}
