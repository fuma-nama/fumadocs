import type { ReactElement } from 'react';
import type { I18nConfig } from '@/i18n';
import type * as PageTree from '../server/page-tree';
import type { Folder, MetaFile, PageFile, Storage } from './file-system';
import { joinPath } from '@/utils/path';
import type { MetaData, PageData, UrlFn } from './types';

interface PageTreeBuilderContext {
  storage: Storage;

  locale?: string;
  localeStorage?: Storage;

  builder: PageTreeBuilder;
  options: BaseOptions;
  getUrl: UrlFn;
}

export interface BaseOptions<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> {
  /**
   * Remove references to the file path of original nodes (`$ref`)
   *
   * @defaultValue false
   */
  noRef?: boolean;

  attachFile?: (node: PageTree.Item, file?: PageFile<Page>) => PageTree.Item;
  attachFolder?: (
    node: PageTree.Folder,
    folder: Folder<Page, Meta>,
    meta?: MetaFile<Meta>,
  ) => PageTree.Folder;
  attachSeparator?: (node: PageTree.Separator) => PageTree.Separator;

  resolveIcon?: (icon: string | undefined) => ReactElement | undefined;
}

export interface BuildPageTreeOptions extends BaseOptions {
  storage: Storage;
}

export interface BuildPageTreeOptionsWithI18n extends BaseOptions {
  storages: Record<string, Storage>;
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
const separator = /^---(?:\[(?<icon>[^\]]+)])?(?<name>.+)---|^---$/;
const rest = '...' as const;
const restReversed = 'z...a' as const;
const extractPrefix = '...';
const excludePrefix = '!';

function isPageFile(node: Folder | PageFile | MetaFile): node is PageFile {
  return 'data' in node && node.format === 'page';
}

/**
 * @param nodes - All nodes to be built (in default locale)
 * @param ctx - Context
 * @param skipIndex - Skip index
 * @returns Nodes with specified locale in context (sorted)
 */
function buildAll(
  nodes: (Folder | MetaFile | PageFile)[],
  ctx: PageTreeBuilderContext,
  skipIndex: boolean,
): PageTree.Node[] {
  const output: PageTree.Node[] = [];
  const folders: PageTree.Folder[] = [];

  for (const node of [...nodes].sort((a, b) =>
    a.file.name.localeCompare(b.file.name),
  )) {
    if (isPageFile(node)) {
      const localized = ctx.localeStorage?.read(
        joinPath(node.file.dirname, node.file.name),
        'page',
      );

      const treeNode = buildFileNode(localized ?? node, ctx);

      if (node.file.name === 'index') {
        if (!skipIndex) output.unshift(treeNode);
      } else {
        output.push(treeNode);
      }
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

  const itemNode =
    ctx.storage.readDir(path) ??
    ctx.localeStorage?.read(path, 'page') ??
    ctx.storage.read(path, 'page');
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
    ctx.localeStorage?.read(metaPath, 'meta') ??
    ctx.storage.read(metaPath, 'meta');

  const indexPath = joinPath(folder.file.path, 'index');
  const indexFile =
    ctx.localeStorage?.read(indexPath, 'page') ??
    ctx.storage.read(indexPath, 'page');

  const isRoot = meta?.data.root ?? isGlobalRoot;
  const index = indexFile ? buildFileNode(indexFile, ctx) : undefined;

  const addedNodePaths = new Set<string>();
  let children: PageTree.Node[];

  if (!meta?.data.pages) {
    children = buildAll(folder.children, ctx, !isRoot);
  } else {
    const resolved = meta.data.pages.flatMap<
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
      meta?.data.title ??
      index?.name ??
      // resolve folder groups like (group_name)
      pathToName(group.exec(folder.file.name)?.[1] ?? folder.file.name),
    icon: ctx.options.resolveIcon?.(meta?.data.icon) ?? index?.icon,
    root: meta?.data.root,
    defaultOpen: meta?.data.defaultOpen,
    description: meta?.data.description,
    index:
      isRoot || (indexFile && !addedNodePaths.has(indexFile.file.path))
        ? index
        : undefined,
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
    url: ctx.getUrl(file.data.slugs, ctx.locale),
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
    $id: ctx.locale ? ctx.locale : 'root',
    name: folder.name,
    children: folder.children,
  };
}

export function createPageTreeBuilder(getUrl: UrlFn): PageTreeBuilder {
  return {
    build(options) {
      return build({
        options,
        builder: this,
        storage: options.storage,
        getUrl,
      });
    },
    buildI18n({ i18n, ...options }) {
      const entries = i18n.languages.map<[string, PageTree.Root]>((lang) => {
        const tree = build({
          options,
          getUrl,
          builder: this,
          locale: lang,
          storage: options.storages[i18n.defaultLanguage],
          localeStorage: options.storages[lang],
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
