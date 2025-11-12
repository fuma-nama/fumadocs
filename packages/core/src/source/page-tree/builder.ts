import type * as PageTree from '@/page-tree/definitions';
import type { MetaData, PageData, UrlFn } from '@/source';
import type { ContentStorage } from '@/source/storage/content';
import { basename, extname, joinPath } from '@/source/path';
import { transformerFallback } from '@/source/page-tree/transformer-fallback';
import type { LoaderPlugin } from '@/source/plugins';

export interface PageTreeBuilderContext<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> {
  rootId: string;
  generateNodeId: () => string;
  options: PageTreeOptions;
  transformers: PageTreeTransformer<Page, Meta>[];

  builder: PageTreeBuilder;
  storage: ContentStorage<Page, Meta>;
  getUrl: UrlFn;

  storages?: Record<string, ContentStorage<Page, Meta>>;
  locale?: string;
}

export interface PageTreeTransformer<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> {
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

export interface PageTreeOptions<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> {
  id?: string;
  /**
   * Remove references to the file path of original nodes (`$ref`)
   *
   * @defaultValue false
   */
  noRef?: boolean;
  /**
   * generate fallback page tree
   *
   * @defaultValue true
   */
  generateFallback?: boolean;

  /**
   * Additional page tree transformers to apply
   */
  transformers?: PageTreeTransformer<Page, Meta>[];
}

export interface PageTreeBuilder {
  build: (storage: ContentStorage, options?: PageTreeOptions) => PageTree.Root;

  buildI18n: (
    storages: Record<string, ContentStorage>,
    options?: PageTreeOptions,
  ) => Record<string, PageTree.Root>;
}

const group = /^\((?<name>.+)\)$/;
const link =
  /^(?<external>external:)?(?:\[(?<icon>[^\]]+)])?\[(?<name>[^\]]+)]\((?<url>[^)]+)\)$/;
const separator = /^---(?:\[(?<icon>[^\]]+)])?(?<name>.+)---|^---$/;
const rest = '...' as const;
const restReversed = 'z...a' as const;
const extractPrefix = '...';
const excludePrefix = '!';

export function createPageTreeBuilder(
  getUrl: UrlFn,
  plugins?: LoaderPlugin[],
): PageTreeBuilder {
  return {
    build(storage, options) {
      const key = '';
      return this.buildI18n({ [key]: storage }, options)[key];
    },
    buildI18n(storages, options = {}) {
      let nextId = 0;
      const out: Record<string, PageTree.Root> = {};
      const transformers: PageTreeTransformer[] = [];

      if (options.transformers) {
        transformers.push(...options.transformers);
      }

      for (const plugin of plugins ?? []) {
        if (plugin.transformPageTree)
          transformers.push(plugin.transformPageTree);
      }

      if (options.generateFallback ?? true) {
        transformers.push(transformerFallback());
      }

      for (const [locale, storage] of Object.entries(storages)) {
        let rootId = locale.length === 0 ? 'root' : locale;
        if (options.id) rootId = `${options.id}-${rootId}`;

        out[locale] = createPageTreeBuilderUtils({
          rootId,
          transformers,
          builder: this,
          options,
          getUrl,
          locale,
          storage,
          storages,
          generateNodeId() {
            return '_' + nextId++;
          },
        }).root();
      }

      return out;
    },
  };
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
    return map.get(name + '.' + format) ?? name;
  };
}

function createPageTreeBuilderUtils(ctx: PageTreeBuilderContext) {
  const resolveFlattenPath = createFlattenPathResolver(ctx.storage);
  const visitedPaths = new Set<string>();

  function nextNodeId(localId = ctx.generateNodeId()) {
    return `${ctx.rootId}:${localId}`;
  }

  return {
    buildPaths(paths: string[], reversed = false): PageTree.Node[] {
      const items: PageTree.Item[] = [];
      const folders: PageTree.Folder[] = [];
      const sortedPaths = paths.sort(
        (a, b) => a.localeCompare(b) * (reversed ? -1 : 1),
      );

      for (const path of sortedPaths) {
        const fileNode = this.file(path);
        if (fileNode) {
          if (basename(path, extname(path)) === 'index')
            items.unshift(fileNode);
          else items.push(fileNode);

          continue;
        }

        const dirNode = this.folder(path, false);
        if (dirNode) folders.push(dirNode);
      }

      return [...items, ...folders];
    },
    resolveFolderItem(
      folderPath: string,
      item: string,
    ): PageTree.Node[] | '...' | 'z...a' {
      if (item === rest || item === restReversed) return item;

      let match = separator.exec(item);
      if (match?.groups) {
        let node: PageTree.Separator = {
          $id: nextNodeId(),
          type: 'separator',
          icon: match.groups.icon,
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
        const { icon, url, name, external } = match.groups;

        let node: PageTree.Item = {
          $id: nextNodeId(),
          type: 'page',
          icon,
          name,
          url,
          external: external ? true : undefined,
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

      const path = resolveFlattenPath(joinPath(folderPath, filename), 'page');

      if (isExcept) {
        visitedPaths.add(path);
        return [];
      }

      const dirNode = this.folder(path, false);
      if (dirNode) {
        return isExtract ? dirNode.children : [dirNode];
      }

      const fileNode = this.file(path);
      return fileNode ? [fileNode] : [];
    },
    folder(
      folderPath: string,
      isGlobalRoot: boolean,
    ): PageTree.Folder | undefined {
      const { storage, options, transformers } = ctx;
      const files = storage.readDir(folderPath);
      if (!files) return;

      const metaPath = resolveFlattenPath(joinPath(folderPath, 'meta'), 'meta');
      const indexPath = resolveFlattenPath(
        joinPath(folderPath, 'index'),
        'page',
      );

      let meta = storage.read(metaPath);
      if (meta?.format !== 'meta') {
        meta = undefined;
      }

      const isRoot = meta?.data.root ?? isGlobalRoot;
      let index: PageTree.Item | undefined;
      let children: PageTree.Node[];

      if (meta && meta.data.pages) {
        const resolved = meta.data.pages.flatMap<
          PageTree.Node | typeof rest | typeof restReversed
        >((item) => this.resolveFolderItem(folderPath, item));

        if (!isRoot && !visitedPaths.has(indexPath)) {
          index = this.file(indexPath);
        }

        for (let i = 0; i < resolved.length; i++) {
          const item = resolved[i];
          if (item !== rest && item !== restReversed) continue;

          const items = this.buildPaths(
            files.filter((file) => !visitedPaths.has(file)),
            item === restReversed,
          );

          resolved.splice(i, 1, ...items);
          break;
        }

        children = resolved as PageTree.Node[];
      } else {
        if (!isRoot && !visitedPaths.has(indexPath)) {
          index = this.file(indexPath);
        }

        children = this.buildPaths(
          files.filter((file) => !visitedPaths.has(file)),
        );
      }

      let name = meta?.data.title ?? index?.name;
      if (!name) {
        const folderName = basename(folderPath);
        name = pathToName(group.exec(folderName)?.[1] ?? folderName);
      }

      let node: PageTree.Folder = {
        type: 'folder',
        name,
        icon: meta?.data.icon ?? index?.icon,
        root: meta?.data.root,
        defaultOpen: meta?.data.defaultOpen,
        description: meta?.data.description,
        index,
        children,
        $id: nextNodeId(folderPath),
        $ref:
          !options.noRef && meta
            ? {
                metaFile: metaPath,
              }
            : undefined,
      };

      visitedPaths.add(folderPath);
      for (const transformer of transformers) {
        if (!transformer.folder) continue;
        node = transformer.folder.call(ctx, node, folderPath, metaPath);
      }

      return node;
    },
    file(path: string): PageTree.Item | undefined {
      const { options, getUrl, storage, locale, transformers } = ctx;

      const page = storage.read(path);
      if (page?.format !== 'page') return;

      const { title, description, icon } = page.data;
      let item: PageTree.Item = {
        $id: nextNodeId(path),
        type: 'page',
        name: title ?? pathToName(basename(path, extname(path))),
        description,
        icon,
        url: getUrl(page.slugs, locale),
        $ref: !options.noRef
          ? {
              file: path,
            }
          : undefined,
      };

      visitedPaths.add(path);
      for (const transformer of transformers) {
        if (!transformer.file) continue;
        item = transformer.file.call(ctx, item, path);
      }

      return item;
    },
    root(): PageTree.Root {
      const folder = this.folder('', true)!;
      let root: PageTree.Root = {
        $id: ctx.rootId,
        name: folder.name || 'Docs',
        children: folder.children,
      };

      for (const transformer of ctx.transformers) {
        if (!transformer.root) continue;
        root = transformer.root.call(ctx, root);
      }

      return root;
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
