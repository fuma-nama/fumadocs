import type * as PageTree from '@/page-tree/definitions';
import type { ResolvedLoaderConfig } from '@/source/loader';
import type { ContentStorage } from '@/source/storage/content';
import { basename, extname, joinPath } from '@/source/path';
import { transformerFallback } from '@/source/page-tree/transformer-fallback';

export interface PageTreeBuilderContext<S extends ContentStorage = ContentStorage> {
  transformers: PageTreeTransformer<S>[];
  builder: PageTreeBuilder;
  storage: S;
  storages?: Record<string, S>;
  locale?: string;
  custom?: Record<string, unknown>;

  options: PageTreeOptions<S>;
}

export interface PageTreeTransformer<S extends ContentStorage = ContentStorage> {
  file?: (this: PageTreeBuilderContext<S>, node: PageTree.Item, filePath?: string) => PageTree.Item;
  folder?: (
    this: PageTreeBuilderContext<S>,
    node: PageTree.Folder,
    folderPath: string,
    metaPath?: string,
  ) => PageTree.Folder;
  separator?: (this: PageTreeBuilderContext<S>, node: PageTree.Separator) => PageTree.Separator;
  root?: (this: PageTreeBuilderContext<S>, node: PageTree.Root) => PageTree.Root;
}

export interface PageTreeOptions<S extends ContentStorage = ContentStorage> {
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
  transformers?: PageTreeTransformer<S>[];

  /** custom context */
  context?: Record<string, unknown>;

  /** customize the default sorting behaviour (`localeCompare`) */
  sort?: {
    /** @default 'path' */
    by?: 'name' | 'path';
    locales?: Intl.LocalesArgument;
    options?: Intl.CollatorOptions;
  };
}

const group = /^\((?<name>.+)\)$/;
const link = /^(?<external>external:)?(?:\[(?<icon>[^\]]+)])?\[(?<name>[^\]]+)]\((?<url>[^)]+)\)$/;
const separator = /^---(?:\[(?<icon>[^\]]+)])?(?<name>.+)---|^---$/;
const rest = '...' as const;
const restReversed = 'z...a' as const;
const extractPrefix = '...';
const excludePrefix = '!';

const SymbolUnfinished = Symbol('unfinished');
const SymbolName = Symbol('name');
const SymbolOwner = Symbol('owner');

interface Attached {
  [SymbolName]?: string;
  [SymbolUnfinished]?: boolean;
  [SymbolOwner]?: { owner: string; priority: number };
}

export interface PageTreeBuilder {
  resolveFlattenPath(name: string, format: string): string;
  root(id?: string, path?: string): PageTree.Root;
}

export function createPageTreeBuilder(
  input: ContentStorage | [locale: string, storages: Record<string, ContentStorage>],
  options: PageTreeOptions,
): PageTreeBuilder {
  const flattenPathToFullPath = new Map<string, string>();
  const transformers: PageTreeTransformer[] = [];
  /** virtual file path -> output page tree node (if cached) */
  const pathToNode = new Map<string, PageTree.Node & Attached>();
  let _nextId = 0;

  const {
    noRef = false,
    idPrefix,
    url: getUrl,
    generateFallback = true,
    sort: { by: sortBy = 'path', locales: sortLocales, options: sortOptions } = {},
  } = options;
  /** passed as additional information to transformers */
  let ctx: PageTreeBuilderContext;

  if (options.transformers) transformers.push(...options.transformers);
  if (generateFallback) transformers.push(transformerFallback());

  if (Array.isArray(input)) {
    const [locale, storages] = input;

    ctx = {
      get builder() {
        return builder;
      },
      storage: storages[locale],
      storages,
      locale,
      transformers,
      custom: options.context,
      options,
    };
  } else {
    ctx = {
      get builder() {
        return builder;
      },
      storage: input,
      transformers,
      custom: options.context,
      options,
    };
  }

  const { storage, locale } = ctx;

  for (const file of storage.getFiles()) {
    const content = storage.read(file)!;
    const flattenPath = file.substring(0, file.length - extname(file).length);

    flattenPathToFullPath.set(flattenPath + '.' + content.format, file);
  }

  function resolveFlattenPath(name: string, format: string) {
    return flattenPathToFullPath.get(name + '.' + format) ?? name;
  }

  /**
   * try to register as the owner of `node`.
   *
   * when a node is referenced by multiple folders, this determines which folder they should belong to.
   *
   * @returns whether the owner owns the node.
   */
  function own(ownerPath: string, node: PageTree.Node & Attached, priority: number): boolean {
    if (node[SymbolUnfinished]) return false;
    const existing = node[SymbolOwner];
    if (!existing) {
      node[SymbolOwner] = { owner: ownerPath, priority };
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

  function transferOwner(ownerPath: string, node: PageTree.Node & Attached) {
    const existing = node[SymbolOwner];
    if (existing) existing.owner = ownerPath;
  }

  function generateId(localId = `_${_nextId++}`) {
    let id = localId;
    if (locale) id = `${locale}:${id}`;
    if (idPrefix) id = `${idPrefix}:${id}`;
    return id;
  }

  function buildPaths(
    paths: string[],
    filter?: (file: string) => boolean,
    reversed = false,
  ): PageTree.Node[] {
    const nodes: ((PageTree.Folder | PageTree.Item) & Attached)[] = [];
    let indexNode: PageTree.Node | undefined;

    for (const path of paths) {
      if (filter && !filter(path)) continue;

      const fileNode = buildFile(path);
      if (fileNode) {
        nodes.push(fileNode);
        if (!indexNode && basename(path, extname(path)) === 'index') {
          indexNode = fileNode;
        }

        continue;
      }

      const dirNode = buildFolder(path);
      if (dirNode) nodes.push(dirNode);
    }

    const factor = reversed ? -1 : 1;
    const useName = sortBy === 'name';

    return nodes.sort((a, b) => {
      if (a === indexNode) return -100;
      if (b === indexNode) return 100;
      const aT = (useName && a[SymbolName]) || (a.type === 'folder' ? a.$ref!.folder : a.$ref!);
      const bT = (useName && b[SymbolName]) || (b.type === 'folder' ? b.$ref!.folder : b.$ref!);
      const aK = a.type === 'folder' ? 10 : 0;
      const bK = b.type === 'folder' ? 10 : 0;

      return factor * (aT.localeCompare(bT, sortLocales, sortOptions) + (aK - bK));
    });
  }

  function resolveLink(item: string) {
    const match = link.exec(item);
    if (!match?.groups) return;

    const { icon, url, name, external } = match.groups;

    let node: PageTree.Item = {
      $id: generateId(),
      type: 'page',
      icon,
      name,
      url,
      external: external ? true : undefined,
    };

    for (const transformer of transformers) {
      if (!transformer.file) continue;
      node = transformer.file.call(ctx, node);
    }

    return node;
  }

  function resolveSeparator(item: string) {
    const match = separator.exec(item);
    if (!match?.groups) return;

    let node: PageTree.Separator = {
      $id: generateId(),
      type: 'separator',
      icon: match.groups.icon,
      name: match.groups.name,
    };

    for (const transformer of transformers) {
      if (!transformer.separator) continue;
      node = transformer.separator.call(ctx, node);
    }

    return node;
  }

  function resolveFolderItem(
    folderPath: string,
    item: string,
    outputArray: (PageTree.Node | '...' | 'z...a')[],
    excludedPaths: Set<string>,
  ) {
    if (item === rest || item === restReversed) {
      outputArray.push(item);
      return;
    }

    const separator = resolveSeparator(item);
    if (separator) {
      outputArray.push(separator);
      return;
    }

    const link = resolveLink(item);
    if (link) {
      outputArray.push(link);
      return;
    }

    if (item.startsWith(excludePrefix)) {
      const path = joinPath(folderPath, item.slice(excludePrefix.length));
      excludedPaths.add(path);
      excludedPaths.add(resolveFlattenPath(path, 'page'));
      return;
    }

    if (item.startsWith(extractPrefix)) {
      const path = joinPath(folderPath, item.slice(extractPrefix.length));
      const node = buildFolder(path);
      if (!node) return;

      const children = node.index ? [node.index, ...node.children] : node.children;
      if (own(folderPath, node, 2)) {
        for (const child of children) {
          transferOwner(folderPath, child);
          outputArray.push(child);
        }
        excludedPaths.add(path);
      } else {
        for (const child of children) {
          if (own(folderPath, child, 2)) outputArray.push(child);
        }
      }
      return;
    }

    let path = joinPath(folderPath, item);
    let node: PageTree.Node | undefined = buildFolder(path);
    if (!node) {
      path = resolveFlattenPath(path, 'page');
      node = buildFile(path);
    }
    if (!node || !own(folderPath, node, 2)) return;
    outputArray.push(node);
    excludedPaths.add(path);
  }

  function buildFolder(folderPath: string, isGlobalRoot = false): PageTree.Folder | undefined {
    const cached = pathToNode.get(folderPath);
    if (cached) return cached as PageTree.Folder;

    const files = storage.readDir(folderPath);
    if (!files) return;

    let metaPath: string | undefined = resolveFlattenPath(joinPath(folderPath, 'meta'), 'meta');
    let meta = storage.read(metaPath);
    if (!meta || meta.format !== 'meta') {
      meta = undefined;
      metaPath = undefined;
    }

    const metadata = meta?.data ?? {};
    const isRoot = metadata.root ?? isGlobalRoot;
    let node: PageTree.Folder & Attached = {
      type: 'folder',
      name: null,
      root: metadata.root,
      defaultOpen: metadata.defaultOpen,
      description: metadata.description,
      collapsible: metadata.collapsible,
      children: [],
      $id: generateId(folderPath),
      $ref: {
        folder: folderPath,
        meta: metaPath,
      },
      [SymbolUnfinished]: true,
    };

    pathToNode.set(folderPath, node);

    let indexPath: string | undefined;

    if (metadata.pagesIndex) {
      const resolvedPath = resolveFlattenPath(joinPath(folderPath, metadata.pagesIndex), 'page');
      const page = buildFile(resolvedPath);

      if (page && own(folderPath, page, 3)) {
        indexPath = resolvedPath;
        node.index = page;
      } else {
        node.index = resolveLink(metadata.pagesIndex);
      }
    } else if (!isRoot) {
      const defaultPath = resolveFlattenPath(joinPath(folderPath, 'index'), 'page');
      const page = buildFile(defaultPath);

      if (page && own(folderPath, page, 0)) {
        indexPath = defaultPath;
        node.index = page;
      }
    }

    if (metadata.pages) {
      const outputArray: (PageTree.Node | typeof rest | typeof restReversed)[] = [];
      const excludedPaths = new Set<string>();
      for (const item of metadata.pages) {
        resolveFolderItem(folderPath, item, outputArray, excludedPaths);
      }

      if (indexPath) {
        if (excludedPaths.has(indexPath)) delete node.index;
        else excludedPaths.add(indexPath);
      }

      for (const item of outputArray) {
        if (item !== rest && item !== restReversed) {
          node.children.push(item);
          continue;
        }

        const resolvedItem = buildPaths(
          files,
          (file) => !excludedPaths.has(file),
          item === restReversed,
        );
        for (const child of resolvedItem) {
          if (own(folderPath, child, 0)) node.children.push(child);
        }
      }
    } else {
      for (const item of buildPaths(files, indexPath ? (file) => file !== indexPath : undefined)) {
        if (own(folderPath, item, 0)) node.children.push(item);
      }
    }

    node.icon = metadata.icon ?? node.index?.icon;
    node.name = metadata.title ?? node.index?.name;
    node[SymbolName] = metadata.title ?? node.index?.[SymbolName as never];

    if (!node.name) {
      const folderName = basename(folderPath);
      node.name = pathToName(group.exec(folderName)?.[1] ?? folderName);
    }
    for (const transformer of transformers) {
      if (!transformer.folder) continue;
      node = transformer.folder.call(ctx, node, folderPath, metaPath);
    }
    pathToNode.set(folderPath, node);
    delete node[SymbolUnfinished];
    return node;
  }

  function buildFile(path: string): PageTree.Item | undefined {
    const cached = pathToNode.get(path);
    if (cached) return cached as PageTree.Item;

    const page = storage.read(path);
    if (!page || page.format !== 'page') return;

    const { title, description, icon } = page.data;
    let item: PageTree.Item & Attached = {
      $id: generateId(path),
      type: 'page',
      name: title ?? pathToName(basename(path, extname(path))),
      description,
      icon,
      url: getUrl(page.slugs, ctx.locale),
      $ref: path,
      [SymbolName]: title,
    };
    for (const transformer of transformers) {
      if (!transformer.file) continue;
      item = transformer.file.call(ctx, item, path);
    }

    pathToNode.set(path, item);
    return item;
  }

  const builder: PageTreeBuilder = {
    resolveFlattenPath,
    root(id = 'root', path = ''): PageTree.Root {
      const folder = buildFolder(path, true);

      for (const node of pathToNode.values()) {
        delete node[SymbolName];
        delete node[SymbolOwner];
        if (noRef && '$ref' in node) delete node.$ref;
      }

      let root: PageTree.Root = {
        type: 'root',
        $ref: folder?.$ref,
        $id: generateId(id),
        name: folder?.name || 'Docs',
        description: folder?.description,
        children: folder ? folder.children : [],
      };

      for (const transformer of transformers) {
        if (!transformer.root) continue;
        root = transformer.root.call(ctx, root);
      }

      return root;
    },
  };
  return builder;
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
