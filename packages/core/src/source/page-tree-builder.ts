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
 * @param filter - filter nodes to be built
 * @param reversed - return in reversed order
 * @returns Nodes with specified locale in context (sorted)
 */
function buildAll(
  nodes: (Folder | MetaFile | PageFile)[],
  ctx: PageTreeBuilderContext,
  filter?: (node: Folder | MetaFile | PageFile) => boolean,
  reversed = false,
): PageTree.Node[] {
  const { localeStorage } = ctx;
  const output: PageTree.Node[] = [];

  for (const node of [...nodes].sort((a, b) => {
    let result;
    if (isPageFile(a) && 'children' in b) result = -1;
    else if ('children' in a && isPageFile(b)) result = 1;
    else result = a.file.name.localeCompare(b.file.name);

    return reversed ? result * -1 : result;
  })) {
    if (filter && !filter(node)) continue;

    if (isPageFile(node)) {
      const localized = localeStorage?.read(
        joinPath(node.file.dirname, node.file.name),
        'page',
      );

      const treeNode = buildFileNode(localized ?? node, ctx);

      if (node.file.name === 'index') {
        output.unshift(treeNode);
        continue;
      }

      output.push(treeNode);
    } else if ('children' in node) {
      output.push(buildFolderNode(node, false, ctx));
    }
  }

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
  const { options, storage, localeStorage } = ctx;

  let match = separator.exec(item);
  if (match?.groups) {
    const node: PageTree.Separator = {
      $id: `${folder.file.path}#${idx}`,
      type: 'separator',
      icon: options.resolveIcon?.(match.groups.icon),
      name: match.groups.name,
    };

    return [options.attachSeparator?.(node) ?? node];
  }

  match = link.exec(item);
  if (match?.groups) {
    const { icon, url, name } = match.groups;
    const isRelative =
      url.startsWith('/') || url.startsWith('#') || url.startsWith('.');

    const node: PageTree.Item = {
      type: 'page',
      icon: options.resolveIcon?.(icon),
      name,
      url,
      external: !isRelative,
    };

    return [options.attachFile?.(node) ?? node];
  }

  const isExcept = item.startsWith(excludePrefix);
  const isExtract = !isExcept && item.startsWith(extractPrefix);

  let filename = item;
  if (isExcept) {
    filename = item.slice(excludePrefix.length);
  } else if (isExtract) {
    filename = item.slice(extractPrefix.length);
  }

  const path = joinPath(folder.file.path, filename);

  const itemNode =
    storage.readDir(path) ??
    localeStorage?.read(path, 'page') ??
    storage.read(path, 'page');
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
  const { storage, localeStorage, options } = ctx;
  const metaPath = joinPath(folder.file.path, 'meta');
  const meta =
    localeStorage?.read(metaPath, 'meta') ?? storage.read(metaPath, 'meta');

  const indexPath = joinPath(folder.file.path, 'index');
  const indexFile =
    localeStorage?.read(indexPath, 'page') ?? storage.read(indexPath, 'page');

  const isRoot = meta?.data.root ?? isGlobalRoot;
  let index: PageTree.Item | undefined;
  let children: PageTree.Node[];

  if (!meta?.data.pages) {
    if (indexFile) index = buildFileNode(indexFile, ctx);

    children = buildAll(folder.children, ctx, (node) => {
      return node.file.name !== 'index' || isRoot;
    });
  } else {
    const addedNodePaths = new Set<string>();
    const resolved = meta.data.pages.flatMap<
      PageTree.Node | typeof rest | typeof restReversed
    >((item, i) => resolveFolderItem(folder, item, ctx, i, addedNodePaths));

    if (indexFile && (isRoot || !addedNodePaths.has(indexFile.file.path))) {
      index = buildFileNode(indexFile, ctx);
    }

    for (let i = 0; i < resolved.length; i++) {
      if (resolved[i] === rest || resolved[i] === restReversed) {
        resolved.splice(
          i,
          1,
          ...buildAll(
            folder.children,
            ctx,
            (node) => {
              if (node.file.name === 'index' && !isRoot) return false;
              return !addedNodePaths.has(node.file.path);
            },
            resolved[i] === restReversed,
          ),
        );
        break;
      }
    }

    children = resolved as PageTree.Node[];
  }

  const node: PageTree.Folder = {
    type: 'folder',
    name:
      meta?.data.title ??
      index?.name ??
      // resolve folder groups like (group_name)
      pathToName(group.exec(folder.file.name)?.[1] ?? folder.file.name),
    icon: options.resolveIcon?.(meta?.data.icon) ?? index?.icon,
    root: meta?.data.root,
    defaultOpen: meta?.data.defaultOpen,
    description: meta?.data.description,
    index,
    children,
    $id: folder.file.path,
    $ref: !options.noRef
      ? {
          metaFile: meta?.file.path,
        }
      : undefined,
  };

  return options.attachFolder?.(node, folder, meta) ?? node;
}

function buildFileNode(
  file: PageFile,
  { options, getUrl, locale }: PageTreeBuilderContext,
): PageTree.Item {
  const item: PageTree.Item = {
    $id: file.file.path,
    type: 'page',
    name: file.data.data.title ?? pathToName(file.file.name),
    description: file.data.data.description,
    icon: options.resolveIcon?.(file.data.data.icon),
    url: getUrl(file.data.slugs, locale),
    $ref: !options.noRef
      ? {
          file: file.file.path,
        }
      : undefined,
  };

  return options.attachFile?.(item, file) ?? item;
}

function build(ctx: PageTreeBuilderContext): PageTree.Root {
  const root = ctx.storage.root();
  const folder = buildFolderNode(root, true, ctx);

  return {
    $id: ctx.locale ?? 'root',
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
