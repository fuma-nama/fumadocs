import type * as PageTree from '@/page-tree/definitions';
import type { LoaderConfig, ResolvedLoaderConfig } from '@/source/loader';
import type { ContentStorage } from '@/source/storage/content';
import { basename, extname, joinPath } from '@/source/path';
import { transformerFallback } from '@/source/page-tree/transformer-fallback';
import type { SourceConfig } from '../source';

export interface PageTreeBuilderContext<Config extends SourceConfig = SourceConfig> {
  idPrefix: string;
  noRef: boolean;
  transformers: PageTreeTransformer<Config>[];

  builder: PageTreeBuilder;
  storage: ContentStorage<Config>;
  getUrl: ResolvedLoaderConfig['url'];

  storages?: Record<string, ContentStorage<Config>>;
  locale?: string;
  custom?: Record<string, unknown>;
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
  /** generate URL from page */
  url: ResolvedLoaderConfig['url'];

  idPrefix?: string;

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

  /** custom context */
  context?: Record<string, unknown>;
}

const group = /^\((?<name>.+)\)$/;
const link = /^(?<external>external:)?(?:\[(?<icon>[^\]]+)])?\[(?<name>[^\]]+)]\((?<url>[^)]+)\)$/;
const separator = /^---(?:\[(?<icon>[^\]]+)])?(?<name>.+)---|^---$/;
const rest = '...' as const;
const restReversed = 'z...a' as const;
const extractPrefix = '...';
const excludePrefix = '!';

export class PageTreeBuilder {
  private readonly flattenPathToFullPath = new Map<string, string>();
  private readonly transformers: PageTreeTransformer[] = [];
  /** virtual file path -> output page tree node (if cached) */
  private readonly pathToNode = new Map<string, PageTree.Node>();
  /** unfinished nodes */
  private readonly unfinished = new WeakSet<PageTree.Node>();
  private readonly ownerMap = new Map<PageTree.Node, { owner: string; priority: number }>();
  private _nextId = 0;

  /** passed as additional information to transformers */
  private readonly ctx: PageTreeBuilderContext;
  private readonly storage: ContentStorage;

  constructor(
    input: ContentStorage | [locale: string, storages: Record<string, ContentStorage>],
    options: PageTreeOptions,
  ) {
    const {
      transformers,
      url,
      context,
      generateFallback = true,
      idPrefix = '',
      noRef = false,
    } = options;
    if (transformers) this.transformers.push(...transformers);
    if (generateFallback) this.transformers.push(transformerFallback());
    this.ctx = {
      builder: this,
      idPrefix,
      getUrl: url,
      storage: undefined as never,
      noRef,
      transformers: this.transformers,
      custom: context,
    };

    if (Array.isArray(input)) {
      const [locale, storages] = input;
      this.ctx.storage = this.storage = storages[locale];
      this.ctx.locale = locale;
      this.ctx.storages = storages;
    } else {
      this.ctx.storage = this.storage = input;
    }

    for (const file of this.storage.getFiles()) {
      const content = this.storage.read(file)!;
      const flattenPath = file.substring(0, file.length - extname(file).length);

      this.flattenPathToFullPath.set(flattenPath + '.' + content.format, file);
    }
  }

  resolveFlattenPath(name: string, format: string) {
    return this.flattenPathToFullPath.get(name + '.' + format) ?? name;
  }

  /**
   * try to register as the owner of `node`.
   *
   * when a node is referenced by multiple folders, this determines which folder they should belong to.
   *
   * @returns whether the owner owns the node.
   */
  private own(ownerPath: string, node: PageTree.Node, priority: number): boolean {
    if (this.unfinished.has(node)) return false;
    const existing = this.ownerMap.get(node);
    if (!existing) {
      this.ownerMap.set(node, { owner: ownerPath, priority });
      return true;
    }
    if (existing.owner === ownerPath) {
      existing.priority = Math.max(existing.priority, priority);
      return true;
    }
    if (existing.priority >= priority) return false;

    // return ownership
    const folder = this.pathToNode.get(existing.owner);
    if (folder && folder.type === 'folder') {
      if (folder.index === node) {
        delete folder.index;
      } else {
        const idx = folder.children.indexOf(node);
        if (idx !== -1) folder.children.splice(idx, 1);
      }
    }
    existing.owner = ownerPath;
    existing.priority = priority;
    return true;
  }

  private transferOwner(ownerPath: string, node: PageTree.Node) {
    const existing = this.ownerMap.get(node);
    if (existing) existing.owner = ownerPath;
  }

  private generateId(localId = `_${this._nextId++}`) {
    let id = localId;
    if (this.ctx.locale) id = `${this.ctx.locale}:${id}`;
    if (this.ctx.idPrefix) id = `${this.ctx.idPrefix}:${id}`;
    return id;
  }

  buildPaths(
    paths: string[],
    filter?: (file: string) => boolean,
    reversed = false,
  ): PageTree.Node[] {
    const items: PageTree.Node[] = [];
    const folders: PageTree.Folder[] = [];
    const sortedPaths = paths.sort((a, b) => (reversed ? b.localeCompare(a) : a.localeCompare(b)));

    for (const path of sortedPaths) {
      if (filter && !filter(path)) continue;

      const fileNode = this.file(path);
      if (fileNode) {
        if (basename(path, extname(path)) === 'index') items.unshift(fileNode);
        else items.push(fileNode);

        continue;
      }

      const dirNode = this.folder(path);
      if (dirNode) folders.push(dirNode);
    }

    items.push(...folders);
    return items;
  }

  private resolveFolderItem(
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
        $id: this.generateId(),
        type: 'separator',
        icon: match.groups.icon,
        name: match.groups.name,
      };

      for (const transformer of this.transformers) {
        if (!transformer.separator) continue;
        node = transformer.separator.call(this.ctx, node);
      }
      outputArray.push(node);
      return;
    }

    match = link.exec(item);
    if (match?.groups) {
      const { icon, url, name, external } = match.groups;

      let node: PageTree.Item = {
        $id: this.generateId(),
        type: 'page',
        icon,
        name,
        url,
      };
      if (external) node.external = true;

      for (const transformer of this.transformers) {
        if (!transformer.file) continue;
        node = transformer.file.call(this.ctx, node);
      }
      outputArray.push(node);
      return;
    }

    if (item.startsWith(excludePrefix)) {
      const path = joinPath(folderPath, item.slice(excludePrefix.length));
      excludedPaths.add(path);
      excludedPaths.add(this.resolveFlattenPath(path, 'page'));
      return;
    }

    if (item.startsWith(extractPrefix)) {
      const path = joinPath(folderPath, item.slice(extractPrefix.length));
      const node = this.folder(path);
      if (!node) return;

      const children = node.index ? [node.index, ...node.children] : node.children;
      if (this.own(folderPath, node, 2)) {
        for (const child of children) {
          this.transferOwner(folderPath, child);
          outputArray.push(child);
        }
        excludedPaths.add(path);
      } else {
        for (const child of children) {
          if (this.own(folderPath, child, 2)) outputArray.push(child);
        }
      }
      return;
    }

    let path = joinPath(folderPath, item);
    let node: PageTree.Node | undefined = this.folder(path);
    if (!node) {
      path = this.resolveFlattenPath(path, 'page');
      node = this.file(path);
    }
    if (!node || !this.own(folderPath, node, 2)) return;
    outputArray.push(node);
    excludedPaths.add(path);
  }

  folder(folderPath: string): PageTree.Folder | undefined {
    const cached = this.pathToNode.get(folderPath);
    if (cached) return cached as PageTree.Folder;

    const files = this.storage.readDir(folderPath);
    if (!files) return;

    const isGlobalRoot = folderPath === '';
    const metaPath = this.resolveFlattenPath(joinPath(folderPath, 'meta'), 'meta');
    const indexPath = this.resolveFlattenPath(joinPath(folderPath, 'index'), 'page');
    let meta = this.storage.read(metaPath);
    if (meta && meta.format !== 'meta') meta = undefined;

    const metadata = meta?.data ?? {};
    let node: PageTree.Folder = {
      type: 'folder',
      name: null,
      root: metadata.root,
      defaultOpen: metadata.defaultOpen,
      description: metadata.description,
      collapsible: metadata.collapsible,
      children: [],
      $id: this.generateId(folderPath),
      $ref:
        !this.ctx.noRef && meta
          ? {
              metaFile: metaPath,
            }
          : undefined,
    };
    this.pathToNode.set(folderPath, node);
    this.unfinished.add(node);

    if (!(metadata.root ?? isGlobalRoot)) {
      const file = this.file(indexPath);
      if (file && this.own(folderPath, file, 0)) node.index = file;
    }

    if (metadata.pages) {
      const outputArray: (PageTree.Node | typeof rest | typeof restReversed)[] = [];
      const excludedPaths = new Set<string>();
      for (const item of metadata.pages) {
        this.resolveFolderItem(folderPath, item, outputArray, excludedPaths);
      }

      if (excludedPaths.has(indexPath)) {
        delete node.index;
      } else if (node.index) {
        excludedPaths.add(indexPath);
      }

      for (const item of outputArray) {
        if (item !== rest && item !== restReversed) {
          node.children.push(item);
          continue;
        }

        const resolvedItem = this.buildPaths(
          files,
          (file) => !excludedPaths.has(file),
          item === restReversed,
        );
        for (const child of resolvedItem) {
          if (this.own(folderPath, child, 0)) node.children.push(child);
        }
      }
    } else {
      for (const item of this.buildPaths(
        files,
        node.index ? (file) => file !== indexPath : undefined,
      )) {
        if (this.own(folderPath, item, 0)) node.children.push(item);
      }
    }

    node.icon = metadata.icon ?? node.index?.icon;
    node.name = metadata.title ?? node.index?.name;
    this.unfinished.delete(node);
    if (!node.name) {
      const folderName = basename(folderPath);
      node.name = pathToName(group.exec(folderName)?.[1] ?? folderName);
    }
    for (const transformer of this.transformers) {
      if (!transformer.folder) continue;
      node = transformer.folder.call(this.ctx, node, folderPath, meta ? metaPath : undefined);
    }
    this.pathToNode.set(folderPath, node);
    return node;
  }

  file(path: string): PageTree.Item | undefined {
    const cached = this.pathToNode.get(path);
    if (cached) return cached as PageTree.Item;

    const page = this.storage.read(path);
    if (!page || page.format !== 'page') return;

    const { title, description, icon } = page.data;
    let item: PageTree.Item = {
      $id: this.generateId(path),
      type: 'page',
      name: title ?? pathToName(basename(path, extname(path))),
      description,
      icon,
      url: this.ctx.getUrl(page.slugs, this.ctx.locale),
      $ref: !this.ctx.noRef
        ? {
            file: path,
          }
        : undefined,
    };
    for (const transformer of this.transformers) {
      if (!transformer.file) continue;
      item = transformer.file.call(this.ctx, item, path);
    }

    this.pathToNode.set(path, item);
    return item;
  }

  root(id = 'root', path = ''): PageTree.Root {
    const folder = this.folder(path);
    let root: PageTree.Root = {
      $id: this.generateId(id),
      name: folder?.name || 'Docs',
      children: folder ? folder.children : [],
    };

    for (const transformer of this.transformers) {
      if (!transformer.root) continue;
      root = transformer.root.call(this.ctx, root);
    }

    return root;
  }
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
