import type * as PageTree from '@/page-tree/definitions';
import type { LoaderConfig, ResolvedLoaderConfig } from '@/source/loader';
import type { ContentStorage } from '@/source/storage/content';
import { basename, extname, joinPath } from '@/source/path';
import { transformerFallback } from '@/source/page-tree/transformer-fallback';
import type { SourceConfig } from '../source';

export interface PageTreeBuilderContext<Config extends SourceConfig = SourceConfig> {
  rootId: string;
  generateNodeId: () => string;
  noRef: boolean;
  transformers: PageTreeTransformer<Config>[];

  builder: PageTreeBuilder;
  storage: ContentStorage<Config>;
  getUrl: ResolvedLoaderConfig['url'];

  storages?: Record<string, ContentStorage<Config>>;
  locale?: string;
}

export interface PageTreeTransformer<Config extends SourceConfig = SourceConfig> {
  file?: (
    this: PageTreeBuilderContext<Config>,
    node: PageTree.Item,
    filePath?: string,
  ) => PageTree.Item;
  folder?: (
    this: PageTreeBuilderContext<Config>,
    node: PageTree.Folder,
    folderPath: string,
    metaPath?: string,
  ) => PageTree.Folder;
  separator?: (
    this: PageTreeBuilderContext<Config>,
    node: PageTree.Separator,
  ) => PageTree.Separator;
  root?: (this: PageTreeBuilderContext<Config>, node: PageTree.Root) => PageTree.Root;
}

export interface PageTreeOptions<Config extends LoaderConfig = LoaderConfig> {
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
  transformers?: PageTreeTransformer<Config['source']>[];
}

export interface PageTreeBuilder {
  build: (storage: ContentStorage, options?: PageTreeOptions) => PageTree.Root;

  buildI18n: (
    storages: Record<string, ContentStorage>,
    options?: PageTreeOptions,
  ) => Record<string, PageTree.Root>;
}

const group = /^\((?<name>.+)\)$/;
const link = /^(?<external>external:)?(?:\[(?<icon>[^\]]+)])?\[(?<name>[^\]]+)]\((?<url>[^)]+)\)$/;
const separator = /^---(?:\[(?<icon>[^\]]+)])?(?<name>.+)---|^---$/;
const rest = '...' as const;
const restReversed = 'z...a' as const;
const extractPrefix = '...';
const excludePrefix = '!';

export function createPageTreeBuilder(loaderConfig: ResolvedLoaderConfig): PageTreeBuilder {
  const { plugins = [], url, pageTree: defaultOptions = {} } = loaderConfig;

  return {
    build(storage, options = defaultOptions) {
      const key = '';
      return this.buildI18n({ [key]: storage }, options)[key];
    },
    buildI18n(storages, options = defaultOptions) {
      let nextId = 0;
      const out: Record<string, PageTree.Root> = {};
      const transformers: PageTreeTransformer[] = [];

      if (options.transformers) {
        transformers.push(...options.transformers);
      }

      for (const plugin of plugins) {
        if (plugin.transformPageTree) transformers.push(plugin.transformPageTree);
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
          noRef: options.noRef ?? false,
          getUrl: url,
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
  /** virtual file path -> output page tree node (if built) */
  const pathToNode = new Map<string, PageTree.Node>();
  const nodeOwner = new Map<PageTree.Node, { owner: string; priority: number }>();

  /**
   * when a node is referenced by multiple folders via `...`, this determines which owner they should belong to.
   *
   * @returns whether the owner owns the node.
   */
  function registerOwner(ownerPath: string, node: PageTree.Node, priority: number): boolean {
    const existing = nodeOwner.get(node);
    if (!existing) {
      nodeOwner.set(node, { owner: ownerPath, priority });
      return true;
    }
    if (existing.owner === ownerPath) {
      existing.priority = Math.max(existing.priority, priority);
      return true;
    }
    if (existing.priority >= priority) return false;

    // return ownership
    const folder = pathToNode.get(existing.owner);
    if (folder && folder.type === 'folder') {
      if (folder.index === node) delete folder.index;
      else folder.children = folder.children.filter((child) => child !== node);
    }
    existing.owner = ownerPath;
    existing.priority = priority;
    return true;
  }

  function transferOwner(ownerPath: string, node: PageTree.Node) {
    const existing = nodeOwner.get(node);
    if (existing) {
      existing.owner = ownerPath;
    }
  }

  function nextNodeId(localId = ctx.generateNodeId()) {
    return `${ctx.rootId}:${localId}`;
  }

  return {
    buildPaths(paths: string[], reversed = false): PageTree.Node[] {
      const items: PageTree.Node[] = [];
      const folders: PageTree.Folder[] = [];
      const sortedPaths = paths.sort((a, b) => a.localeCompare(b) * (reversed ? -1 : 1));

      for (const path of sortedPaths) {
        const fileNode = this.file(path);
        if (fileNode) {
          if (basename(path, extname(path)) === 'index') items.unshift(fileNode);
          else items.push(fileNode);

          continue;
        }

        const dirNode = this.folder(path, false);
        if (dirNode) folders.push(dirNode);
      }

      items.push(...folders);
      return items;
    },
    resolveFolderItem(
      folderPath: string,
      item: string,
      outputArray: (PageTree.Node | '...' | 'z...a')[],
      excludedPaths: Set<string>,
    ) {
      if (item === rest || item === restReversed) {
        outputArray.push(item);
        return;
      }

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
        outputArray.push(node);
        return;
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
        outputArray.push(node);
        return;
      }

      if (item.startsWith(excludePrefix)) {
        excludedPaths.add(
          resolveFlattenPath(joinPath(folderPath, item.slice(excludePrefix.length)), 'page'),
        );
        return;
      }

      if (item.startsWith(extractPrefix)) {
        const path = joinPath(folderPath, item.slice(extractPrefix.length));
        const node = this.folder(path, false);
        if (!node) return;

        excludedPaths.add(path);
        if (registerOwner(folderPath, node, 2)) {
          for (const child of node.children) {
            transferOwner(folderPath, node);
            outputArray.push(child);
          }
        } else {
          for (const child of node.children) {
            if (registerOwner(folderPath, child, 2)) outputArray.push(child);
          }
        }
        return;
      }

      const path = resolveFlattenPath(joinPath(folderPath, item), 'page');
      const node = this.folder(path, false) ?? this.file(path);
      if (node) {
        if (registerOwner(folderPath, node, 2)) outputArray.push(node);
        excludedPaths.add(path);
      }
    },
    folder(folderPath: string, isGlobalRoot: boolean): PageTree.Folder | undefined {
      const cached = pathToNode.get(folderPath);
      if (cached) return cached as PageTree.Folder;

      const files = ctx.storage.readDir(folderPath);
      if (!files) return;

      const metaPath = resolveFlattenPath(joinPath(folderPath, 'meta'), 'meta');
      const indexPath = resolveFlattenPath(joinPath(folderPath, 'index'), 'page');
      let meta = ctx.storage.read(metaPath);
      if (meta && meta.format !== 'meta') meta = undefined;

      const metadata = meta?.data ?? {};
      let index: PageTree.Item | undefined;
      const children: PageTree.Node[] = [];

      if (!(metadata.root ?? isGlobalRoot)) {
        const file = this.file(indexPath);
        if (file && registerOwner(folderPath, file, 0)) index = file;
      }

      if (metadata.pages) {
        const outputArray: (PageTree.Node | typeof rest | typeof restReversed)[] = [];
        const excludedPaths = new Set<string>();
        for (const item of metadata.pages) {
          this.resolveFolderItem(folderPath, item, outputArray, excludedPaths);
        }

        for (const item of outputArray) {
          if (item !== rest && item !== restReversed) {
            if (item === index) index = undefined;
            children.push(item);
            continue;
          }

          const resolvedItem = this.buildPaths(
            files.filter((file) => !excludedPaths.has(file)),
            item === restReversed,
          );
          for (const child of resolvedItem) {
            if (registerOwner(folderPath, child, 0)) children.push(child);
          }
        }
      } else {
        for (const item of this.buildPaths(files)) {
          if (item !== index && registerOwner(folderPath, item, 0)) children.push(item);
        }
      }

      let node: PageTree.Folder = {
        type: 'folder',
        name:
          metadata.title ??
          index?.name ??
          (() => {
            const folderName = basename(folderPath);
            return pathToName(group.exec(folderName)?.[1] ?? folderName);
          })(),
        icon: metadata.icon ?? index?.icon,
        root: metadata.root,
        defaultOpen: metadata.defaultOpen,
        description: metadata.description,
        collapsible: metadata.collapsible,
        index,
        children,
        $id: nextNodeId(folderPath),
        $ref:
          !ctx.noRef && meta
            ? {
                metaFile: metaPath,
              }
            : undefined,
      };

      for (const transformer of ctx.transformers) {
        if (!transformer.folder) continue;
        node = transformer.folder.call(ctx, node, folderPath, metaPath);
      }
      pathToNode.set(folderPath, node);
      return node;
    },
    file(path: string): PageTree.Item | undefined {
      const cached = pathToNode.get(path);
      if (cached) return cached as PageTree.Item;

      const page = ctx.storage.read(path);
      if (!page || page.format !== 'page') return;

      const { title, description, icon } = page.data;
      let item: PageTree.Item = {
        $id: nextNodeId(path),
        type: 'page',
        name: title ?? pathToName(basename(path, extname(path))),
        description,
        icon,
        url: ctx.getUrl(page.slugs, ctx.locale),
        $ref: !ctx.noRef
          ? {
              file: path,
            }
          : undefined,
      };
      for (const transformer of ctx.transformers) {
        if (!transformer.file) continue;
        item = transformer.file.call(ctx, item, path);
      }

      pathToNode.set(path, item);
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
