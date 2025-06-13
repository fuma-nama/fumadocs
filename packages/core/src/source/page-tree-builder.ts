import type { ReactElement } from 'react';
import type { I18nConfig } from '@/i18n';
import type * as PageTree from '../server/page-tree';
import { joinPath } from '@/utils/path';
import type { MetaData, PageData, UrlFn } from './types';
import type { ContentStorage, MetaFile, PageFile } from '@/source/load-files';
import { basename, extname } from '@/source/path';

interface PageTreeBuilderContext {
  storage: ContentStorage;
  resolveName: (name: string, format: 'meta' | 'page') => string;

  locale?: string;
  localeStorage?: ContentStorage;

  builder: PageTreeBuilder;
  options: BaseOptions;
  getUrl: UrlFn;
}

interface BaseOptions<
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
    folder: {
      children: (PageFile<Page> | MetaFile<Meta>)[];
    },
    meta?: MetaFile<Meta>,
  ) => PageTree.Folder;
  attachSeparator?: (node: PageTree.Separator) => PageTree.Separator;

  resolveIcon?: (icon: string | undefined) => ReactElement | undefined;
}

export interface BuildPageTreeOptions<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> extends BaseOptions<Page, Meta> {
  storage: ContentStorage;
}

export interface BuildPageTreeOptionsWithI18n<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> extends BaseOptions<Page, Meta> {
  storages: Record<string, ContentStorage>;
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

function buildAll(
  paths: string[],
  ctx: PageTreeBuilderContext,
  filter?: (path: string) => boolean,
  reversed = false,
): PageTree.Node[] {
  const output: PageTree.Node[] = [];
  const sortedPaths = (filter ? paths.filter(filter) : [...paths]).sort(
    (a, b) => a.localeCompare(b) * (reversed ? -1 : 1),
  );

  for (const path of sortedPaths) {
    const fileNode = buildFileNode(path, ctx);
    if (!fileNode) continue;

    if (basename(path, extname(path)) === 'index') output.unshift(fileNode);
    else output.push(fileNode);
  }

  for (const dir of sortedPaths) {
    const dirNode = buildFolderNode(dir, false, ctx);
    if (dirNode) output.push(dirNode);
  }

  return output;
}

function resolveFolderItem(
  folderPath: string,
  item: string,
  ctx: PageTreeBuilderContext,
  idx: number,
  restNodePaths: Set<string>,
): PageTree.Node[] | typeof rest | typeof restReversed {
  if (item === rest || item === restReversed) return item;
  const { options, resolveName } = ctx;

  let match = separator.exec(item);
  if (match?.groups) {
    const node: PageTree.Separator = {
      $id: `${folderPath}#${idx}`,
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

  const path = resolveName(joinPath(folderPath, filename), 'page');
  restNodePaths.delete(path);

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
  const { storage, localeStorage, options, resolveName } = ctx;
  const files = storage.readDir(folderPath);
  if (!files) return;

  const metaPath = resolveName(joinPath(folderPath, 'meta'), 'meta');
  const indexPath = resolveName(joinPath(folderPath, 'index'), 'page');

  let meta = localeStorage?.read(metaPath) ?? storage.read(metaPath);
  if (meta?.format !== 'meta') {
    meta = undefined;
  }

  const isRoot = meta?.data.root ?? isGlobalRoot;
  let indexDisabled = false;
  let children: PageTree.Node[];

  if (!meta?.data.pages) {
    children = buildAll(files, ctx, (file) => isRoot || file !== indexPath);
  } else {
    const restItems = new Set<string>(files);
    const resolved = meta.data.pages.flatMap<
      PageTree.Node | typeof rest | typeof restReversed
    >((item, i) => resolveFolderItem(folderPath, item, ctx, i, restItems));

    // disable folder index if it is used in `pages`
    if (!isRoot && !restItems.has(indexPath)) {
      indexDisabled = true;
    }

    for (let i = 0; i < resolved.length; i++) {
      const item = resolved[i];
      if (item !== rest && item !== restReversed) continue;

      const items = buildAll(
        files,
        ctx,
        // index files are not included in ... unless it's a root folder
        (file) => (file !== indexPath || isRoot) && restItems.has(file),
        item === restReversed,
      );

      resolved.splice(i, 1, ...items);
      break;
    }

    children = resolved as PageTree.Node[];
  }

  const index = !indexDisabled ? buildFileNode(indexPath, ctx) : undefined;

  let name = meta?.data.title ?? index?.name;
  if (!name) {
    const folderName = basename(folderPath);
    name = pathToName(group.exec(folderName)?.[1] ?? folderName);
  }

  const node: PageTree.Folder = {
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

  return (
    options.attachFolder?.(
      node,
      {
        get children() {
          return files.flatMap((file) => storage.read(file) ?? []);
        },
      },
      meta,
    ) ?? node
  );
}

function buildFileNode(
  path: string,
  { options, getUrl, storage, localeStorage, locale }: PageTreeBuilderContext,
): PageTree.Item | undefined {
  const page = localeStorage?.read(path) ?? storage.read(path);
  if (page?.format !== 'page') return;

  const { title, description, icon } = page.data;
  const item: PageTree.Item = {
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

  return options.attachFile?.(item, page) ?? item;
}

function build(ctx: PageTreeBuilderContext): PageTree.Root {
  const folder = buildFolderNode('', true, ctx)!;

  return {
    $id: ctx.locale ?? 'root',
    name: folder.name,
    children: folder.children,
  };
}

export function createPageTreeBuilder(getUrl: UrlFn): PageTreeBuilder {
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
    build(options) {
      const resolve = createFlattenPathResolver(options.storage);

      return build({
        options,
        builder: this,
        storage: options.storage,
        getUrl,
        resolveName(name, format) {
          return resolve(name, format) ?? name;
        },
      });
    },
    buildI18n({ i18n, ...options }) {
      const storage = options.storages[i18n.defaultLanguage];
      const resolve = createFlattenPathResolver(storage);

      const entries = i18n.languages.map<[string, PageTree.Root]>((lang) => {
        const tree = build({
          options,
          getUrl,
          builder: this,
          locale: lang,
          storage,
          localeStorage: options.storages[lang],
          resolveName(name, format) {
            return resolve(name, format) ?? name;
          },
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
