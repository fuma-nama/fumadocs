import type { ReactElement } from 'react';
import type { I18nConfig } from '@/i18n';
import type * as PageTree from '../server/page-tree';
import type { File, Folder, MetaFile, PageFile, Storage } from './file-system';
import { joinPath } from '@/utils/path';
import { type UrlFn } from './types';

interface PageTreeBuilderContext {
  lang?: string;
  defaultLanguage?: string;

  storage: Storage;
  builder: PageTreeBuilder;
  options: BuildPageTreeOptions;
}

export interface BuildPageTreeOptions {
  /**
   * Remove references to the file path of original nodes (`$ref`)
   *
   * @defaultValue false
   */
  noRef?: boolean;

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
const separator = /^---(?:\[(?<icon>[^\]]+)])?(?<name>.+)---$/;
const rest = '...' as const;
const restReversed = 'z...a' as const;
const extractPrefix = '...';
const excludePrefix = '!';

function isPageFile(node: Folder | File): node is PageFile {
  return 'data' in node && node.format === 'page';
}

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
    if (isPageFile(node)) {
      if (
        node.file.locale.length > 0 &&
        node.file.locale.slice(1) !== ctx.defaultLanguage
      )
        continue;

      const localized = ctx.storage.read(
        joinPath(node.file.dirname, `${node.file.name}.${ctx.lang}`),
        'page',
      );

      const treeNode = buildFileNode(localized ?? node, ctx);

      if (node.file.name === 'index') {
        if (!skipIndex) output.unshift(treeNode);
        continue;
      }

      output.push(treeNode);
    }

    if ('children' in node) {
      const folder = buildFolderNode(node, false, ctx);

      if (folder.children.length === 0 && folder.index) {
        output.push(folder.index);
      } else {
        folders.push(folder);
      }
    }
  }

  output.push(...folders);
  return output;
}

function resolveFolderItem(
  folder: Folder,
  item: string,
  ctx: PageTreeBuilderContext,
  idx: number,
  addedNodePaths: Set<string>,
): PageTree.Node[] | typeof rest | typeof restReversed {
  if (item === rest || item === restReversed) return item;

  let match = separator.exec(item);
  if (match?.groups) {
    const node: PageTree.Separator = {
      $id: `${folder.file.path}#${idx}`,
      type: 'separator',
      icon: ctx.options.resolveIcon?.(match.groups.icon),
      name: match.groups.name,
    };

    return [ctx.options.attachSeparator?.(node) ?? node];
  }

  match = link.exec(item);
  if (match?.groups) {
    const { icon, url, name } = match.groups;
    const isRelative =
      url.startsWith('/') || url.startsWith('#') || url.startsWith('.');

    const node: PageTree.Item = {
      type: 'page',
      icon: ctx.options.resolveIcon?.(icon),
      name,
      url,
      external: !isRelative,
    };

    return [ctx.options.attachFile?.(node) ?? node];
  }

  const isExcept = item.startsWith(excludePrefix),
    isExtract = item.startsWith(extractPrefix);

  let filename = item;
  if (isExcept) {
    filename = item.slice(excludePrefix.length);
  } else if (isExtract) {
    filename = item.slice(extractPrefix.length);
  }

  const path = joinPath(folder.file.path, filename);

  let itemNode: Folder | PageFile | undefined = ctx.storage.readDir(path);

  if (!itemNode) {
    itemNode =
      (ctx.lang ? ctx.storage.read(`${path}.${ctx.lang}`, 'page') : null) ??
      ctx.storage.read(`${path}.${ctx.defaultLanguage}`, 'page') ??
      ctx.storage.read(path, 'page');
  }

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
  const metaPath = joinPath(folder.file.path, 'meta');
  const meta =
    ctx.storage.read(`${metaPath}.${ctx.lang}`, 'meta') ??
    ctx.storage.read(`${metaPath}.${ctx.defaultLanguage}`, 'meta') ??
    ctx.storage.read(metaPath, 'meta');

  const indexFile = ctx.storage.read(
    joinPath(folder.file.path, 'index'),
    'page',
  );

  const metadata = meta?.data;
  const isRoot = metadata?.root ?? isGlobalRoot;
  const index = indexFile ? buildFileNode(indexFile, ctx) : undefined;

  let children: PageTree.Node[];

  if (!metadata?.pages) {
    children = buildAll(folder.children, ctx, !isRoot);
  } else {
    const addedNodePaths = new Set<string>();

    const resolved = metadata?.pages?.flatMap<
      PageTree.Node | typeof rest | typeof restReversed
    >((item, i) => {
      return resolveFolderItem(folder, item, ctx, i, addedNodePaths);
    });

    const restNodes = buildAll(
      folder.children.filter((node) => !addedNodePaths.has(node.file.path)),
      ctx,
      !isRoot,
    );

    const nodes = resolved?.flatMap<PageTree.Node>((item) => {
      if (item === rest) {
        return restNodes;
      } else if (item === restReversed) {
        return restNodes.reverse();
      }

      return item;
    });

    children = nodes ?? restNodes;
  }

  const node: PageTree.Folder = {
    type: 'folder',
    name:
      metadata?.title ??
      index?.name ??
      // resolve folder groups like (group_name)
      pathToName(group.exec(folder.file.name)?.[1] ?? folder.file.name),
    icon: ctx.options.resolveIcon?.(metadata?.icon) ?? index?.icon,
    root: metadata?.root,
    defaultOpen: metadata?.defaultOpen,
    description: metadata?.description,
    index,
    children,
    $id: folder.file.path,
    $ref: !ctx.options.noRef
      ? {
          metaFile: meta?.file.path,
        }
      : undefined,
  };

  return ctx.options.attachFolder?.(node, folder, meta) ?? node;
}

function buildFileNode(
  file: PageFile,
  ctx: PageTreeBuilderContext,
): PageTree.Item {
  const item: PageTree.Item = {
    $id: file.file.path,
    type: 'page',
    name: file.data.data.title ?? pathToName(file.file.name),
    description: file.data.data.description,
    icon: ctx.options.resolveIcon?.(file.data.data.icon),
    url: ctx.options.getUrl(file.data.slugs, ctx.lang),
    $ref: !ctx.options.noRef
      ? {
          file: file.file.path,
        }
      : undefined,
  };

  return ctx.options.attachFile?.(item, file) ?? item;
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
          defaultLanguage: i18n.defaultLanguage,
        });

        return [lang, tree];
      });

      return Object.fromEntries(entries);
    },
  };
}

/**
 * Get item name from file name
 *
 * @param name - file name
 */
function pathToName(name: string): string {
  const result = [];
  for (const c of name) {
    if (result.length === 0) result.push(c.toLocaleUpperCase());
    else if (c === '-') result.push(' ');
    else result.push(c);
  }

  return result.join('');
}
