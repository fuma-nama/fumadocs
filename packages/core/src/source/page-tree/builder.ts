import type { ReactNode } from 'react';
import type * as PageTree from './definitions';
import { joinPath } from '@/utils/path';
import type { MetaData, PageData, UrlFn } from '../types';
import type { ContentStorage } from '@/source/load-files';
import { basename, extname } from '@/source/path';
import {
  legacyTransformer,
  type LegacyTransformerOptions,
} from '@/source/page-tree/legacy';
import { transformerFallback } from '@/source/page-tree/transformer-fallback';

export interface PageTreeBuilderContext<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> {
  /**
   * @internal resolve paths without extensions
   */
  resolveName: (name: string, format: 'meta' | 'page') => string;
  options: BaseOptions<Page, Meta>;
  transformers: PageTreeTransformer<Page, Meta>[];

  builder: PageTreeBuilder<Page, Meta>;
  storage: ContentStorage<Page, Meta>;
  getUrl: UrlFn;

  storages?: Record<string, ContentStorage<Page, Meta>>;
  locale?: string;
  visitedPaths: Set<string>;
}

export interface PageTreeTransformer<
  // eslint-disable-next-line
  Page extends PageData = any,
  // eslint-disable-next-line
  Meta extends MetaData = any,
> {
  name?: string;

  file?: (
    this: PageTreeBuilderContext<Page, Meta>,
    node: PageTree.Item,
    filePath?: string,
  ) => PageTree.Item;
  folder?: (
    this: PageTreeBuilderContext<Page, Meta>,
    node: PageTree.Folder,
    folderPath: string,
    metaPath?: string,
  ) => PageTree.Folder;
  separator?: (
    this: PageTreeBuilderContext<Page, Meta>,
    node: PageTree.Separator,
  ) => PageTree.Separator;
  root?: (
    this: PageTreeBuilderContext<Page, Meta>,
    node: PageTree.Root,
  ) => PageTree.Root;
}

export interface BaseOptions<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> extends LegacyTransformerOptions<Page, Meta> {
  /**
   * Remove references to the file path of original nodes (`$ref`)
   *
   * @defaultValue false
   */
  noRef?: boolean;
  transformers?: PageTreeTransformer<Page, Meta>[];
  resolveIcon?: (icon: string | undefined) => ReactNode | undefined;
  /**
   * generate fallback page tree
   *
   * @defaultValue true
   */
  generateFallback?: boolean;
}

export interface PageTreeBuilder<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> {
  build: (
    options: BaseOptions<Page, Meta> & {
      id?: string;
      storage: ContentStorage<Page, Meta>;
    },
  ) => PageTree.Root;

  /**
   * Build page tree and fallback to the default language if the localized page doesn't exist
   */
  buildI18n: (
    options: BaseOptions<Page, Meta> & {
      id?: string;
      storages: Record<string, ContentStorage<Page, Meta>>;
    },
  ) => Record<string, PageTree.Root>;
}

const group = /^\((?<name>.+)\)$/;
const link = /^(?:\[(?<icon>[^\]]+)])?\[(?<name>[^\]]+)]\((?<url>[^)]+)\)$/;
const separator = /^---(?:\[(?<icon>[^\]]+)])?(?<name>.+)---|^---$/;
const rest = '...' as const;
const restReversed = 'z...a' as const;
const extractPrefix = '...';
const excludePrefix = '!';

function buildAll(
  paths: string[],
  ctx: PageTreeBuilderContext,
  reversed = false,
): PageTree.Node[] {
  const items: PageTree.Item[] = [];
  const folders: PageTree.Folder[] = [];
  const sortedPaths = paths.sort(
    (a, b) => a.localeCompare(b) * (reversed ? -1 : 1),
  );

  for (const path of sortedPaths) {
    ctx.visitedPaths.add(path);

    const fileNode = buildFileNode(path, ctx);
    if (fileNode) {
      if (basename(path, extname(path)) === 'index') items.unshift(fileNode);
      else items.push(fileNode);

      continue;
    }

    const dirNode = buildFolderNode(path, false, ctx);
    if (dirNode) folders.push(dirNode);
  }

  return [...items, ...folders];
}

function resolveFolderItem(
  folderPath: string,
  item: string,
  ctx: PageTreeBuilderContext,
  idx: number,
): PageTree.Node[] | '...' | 'z...a' {
  if (item === rest || item === restReversed) return item;
  const { options, resolveName } = ctx;

  let match = separator.exec(item);
  if (match?.groups) {
    let node: PageTree.Separator = {
      $id: `${folderPath}#${idx}`,
      type: 'separator',
      icon: options.resolveIcon?.(match.groups.icon),
      name: match.groups.name,
    };

    for (const transformer of ctx.transformers) {
      if (!transformer.separator) continue;
      node = transformer.separator.call(ctx, node);
    }

    return [node];
  }

  match = link.exec(item);
  if (match?.groups) {
    const { icon, url, name } = match.groups;
    const isRelative =
      url.startsWith('/') || url.startsWith('#') || url.startsWith('.');

    let node: PageTree.Item = {
      type: 'page',
      icon: options.resolveIcon?.(icon),
      name,
      url,
      external: !isRelative,
    };

    for (const transformer of ctx.transformers) {
      if (!transformer.file) continue;
      node = transformer.file.call(ctx, node);
    }

    return [node];
  }

  const isExcept = item.startsWith(excludePrefix);
  const isExtract = !isExcept && item.startsWith(extractPrefix);

  let filename = item;
  if (isExcept) {
    filename = item.slice(excludePrefix.length);
  } else if (isExtract) {
    filename = item.slice(extractPrefix.length);
  }

  const path = resolveName(joinPath(folderPath, filename), 'page');
  ctx.visitedPaths.add(path);

  if (isExcept) return [];

  const dirNode = buildFolderNode(path, false, ctx);
  if (dirNode) {
    return isExtract ? dirNode.children : [dirNode];
  }

  const fileNode = buildFileNode(path, ctx);
  return fileNode ? [fileNode] : [];
}

function buildFolderNode(
  folderPath: string,
  isGlobalRoot: boolean,
  ctx: PageTreeBuilderContext,
): PageTree.Folder | undefined {
  const { storage, options, resolveName, transformers } = ctx;
  const files = storage.readDir(folderPath);
  if (!files) return;

  const metaPath = resolveName(joinPath(folderPath, 'meta'), 'meta');
  const indexPath = resolveName(joinPath(folderPath, 'index'), 'page');

  let meta = storage.read(metaPath);
  if (meta?.format !== 'meta') {
    meta = undefined;
  }

  const isRoot = meta?.data.root ?? isGlobalRoot;
  let index: PageTree.Item | undefined;
  let children: PageTree.Node[];

  function setIndexIfUnused() {
    if (isRoot || ctx.visitedPaths.has(indexPath)) return;
    ctx.visitedPaths.add(indexPath);
    index = buildFileNode(indexPath, ctx);
  }

  if (!meta?.data.pages) {
    setIndexIfUnused();
    children = buildAll(
      files.filter((file) => !ctx.visitedPaths.has(file)),
      ctx,
    );
  } else {
    const resolved = meta.data.pages.flatMap<
      PageTree.Node | typeof rest | typeof restReversed
    >((item, i) => resolveFolderItem(folderPath, item, ctx, i));
    setIndexIfUnused();

    for (let i = 0; i < resolved.length; i++) {
      const item = resolved[i];
      if (item !== rest && item !== restReversed) continue;

      const items = buildAll(
        files.filter((file) => !ctx.visitedPaths.has(file)),
        ctx,
        item === restReversed,
      );

      resolved.splice(i, 1, ...items);
      break;
    }

    children = resolved as PageTree.Node[];
  }

  let name = meta?.data.title ?? index?.name;
  if (!name) {
    const folderName = basename(folderPath);
    name = pathToName(group.exec(folderName)?.[1] ?? folderName);
  }

  let node: PageTree.Folder = {
    type: 'folder',
    name,
    icon: options.resolveIcon?.(meta?.data.icon) ?? index?.icon,
    root: meta?.data.root,
    defaultOpen: meta?.data.defaultOpen,
    description: meta?.data.description,
    index,
    children,
    $id: folderPath,
    $ref:
      !options.noRef && meta
        ? {
            metaFile: metaPath,
          }
        : undefined,
  };

  for (const transformer of transformers) {
    if (!transformer.folder) continue;
    node = transformer.folder.call(ctx, node, folderPath, metaPath);
  }

  return node;
}

function buildFileNode(
  path: string,
  ctx: PageTreeBuilderContext,
): PageTree.Item | undefined {
  const { options, getUrl, storage, locale, transformers } = ctx;

  const page = storage.read(path);
  if (page?.format !== 'page') return;

  const { title, description, icon } = page.data;
  let item: PageTree.Item = {
    $id: path,
    type: 'page',
    name: title ?? pathToName(basename(path, extname(path))),
    description,
    icon: options.resolveIcon?.(icon),
    url: getUrl(page.slugs, locale),
    $ref: !options.noRef
      ? {
          file: path,
        }
      : undefined,
  };

  for (const transformer of transformers) {
    if (!transformer.file) continue;
    item = transformer.file.call(ctx, item, path);
  }

  return item;
}

function build(id: string, ctx: PageTreeBuilderContext): PageTree.Root {
  const folder = buildFolderNode('', true, ctx)!;
  let root: PageTree.Root = {
    $id: id,
    name: folder.name,
    children: folder.children,
  };

  for (const transformer of ctx.transformers) {
    if (!transformer.root) continue;
    root = transformer.root.call(ctx, root);
  }

  return root;
}

export function createPageTreeBuilder(getUrl: UrlFn): PageTreeBuilder {
  function getTransformers(options: BaseOptions, generateFallback: boolean) {
    const transformers: PageTreeTransformer[] = [legacyTransformer(options)];

    if (options.transformers) {
      transformers.push(...options.transformers);
    }

    if (generateFallback) {
      transformers.push(transformerFallback());
    }

    return transformers;
  }

  function createFlattenPathResolver(storage: ContentStorage) {
    const map = new Map<string, string>();
    const files = storage.getFiles();
    for (const file of files) {
      const content = storage.read(file)!;
      const flattenPath = file.substring(0, file.length - extname(file).length);

      map.set(flattenPath + '.' + content.format, file);
    }

    return (name: string, format: string) => {
      return map.get(name + '.' + format);
    };
  }

  return {
    build({ storage, id, ...options }) {
      const key = '';

      return this.buildI18n({
        id,
        storages: { [key]: storage },
        ...options,
      })[key];
    },
    buildI18n({ id, storages, generateFallback = true, ...options }) {
      const transformers = getTransformers(options, generateFallback);
      const out: Record<string, PageTree.Root> = {};

      for (const [locale, storage] of Object.entries(storages)) {
        const resolve = createFlattenPathResolver(storage);
        const branch = locale.length === 0 ? 'root' : locale;

        out[locale] = build(id ? `${id}-${branch}` : branch, {
          transformers,
          builder: this,
          options,
          getUrl,
          locale,
          storage,
          storages,
          visitedPaths: new Set<string>(),
          resolveName(name, format) {
            return resolve(name, format) ?? name;
          },
        });
      }

      return out;
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
