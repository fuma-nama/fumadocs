import type * as PageTree from '@/page-tree/definitions';
import type { ResolvedLoaderConfig } from '@/source/loader';
import type { ContentStorage } from '@/source/storage/content';
import { FileSystem } from '@/source/storage/file-system';
import { basename, extname, joinPath } from '@/source/path';
import type { MetaData } from '@/source/source';

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

export interface PageTreeBuilder {
  resolveFlattenPath(name: string, format: string): string;
  root(id?: string, path?: string): PageTree.Root;
}

const group = /^\((?<name>.+)\)$/;
const link = /^(?<external>external:)?(?:\[(?<icon>[^\]]+)])?\[(?<name>[^\]]+)]\((?<url>[^)]+)\)$/;
const separator = /^---(?:\[(?<icon>[^\]]+)])?(?<name>.+)---|^---$/;

interface Entry<Node extends PageTree.Item | PageTree.Folder = PageTree.Item | PageTree.Folder> {
  node: Node;
  path: string;
  /** for sorting by name */
  title?: string;
  /** the folder displaying the node */
  owner?: Entry<PageTree.Folder>;
  priority: number;
  done: boolean;
}

export function createPageTreeBuilder(
  storage: ContentStorage,
  options: PageTreeOptions,
  locale?: string,
  storages?: Record<string, ContentStorage>,
): PageTreeBuilder {
  const { idPrefix, transformers = [], sort = {} } = options;
  const byName = sort.by === 'name';
  // `localeCompare()` without options is faster than a collator
  const compare =
    sort.locales || sort.options
      ? new Intl.Collator(sort.locales, sort.options).compare
      : (a: string, b: string) => a.localeCompare(b);
  /** file or folder path -> entry */
  const entries = new Map<string, Entry>();
  const entryOf = new Map<PageTree.Node, Entry>();
  const metaPaths = new Set<string>();
  /** format -> file path without extension -> file path */
  const flattenPaths = new Map<string, Map<string, string>>();
  let nextId = 0;
  let usedPages = 0;

  for (const [path, file] of storage.files) {
    let paths = flattenPaths.get(file.format);
    if (!paths) flattenPaths.set(file.format, (paths = new Map()));
    paths.set(path.slice(0, path.length - extname(path).length), path);
  }

  const builder: PageTreeBuilder = { resolveFlattenPath, root };
  const ctx: PageTreeBuilderContext = {
    transformers,
    builder,
    storage,
    storages,
    locale,
    custom: options.context,
    options,
  };

  function resolveFlattenPath(name: string, format: string): string {
    return flattenPaths.get(format)?.get(name) ?? name;
  }

  function createId(localId = `_${nextId++}`): string {
    if (locale) localId = `${locale}:${localId}`;
    return idPrefix ? `${idPrefix}:${localId}` : localId;
  }

  /**
   * claim a node for `folder`, a node referenced by multiple folders belongs to the highest priority:
   * `pagesIndex` (3) > path & extract (2) > rest & default index (0), the first one wins a tie.
   */
  function own(folder: Entry<PageTree.Folder>, entry: Entry, priority: number): boolean {
    if (!entry.done) return false;
    const prev = entry.owner;
    if (prev && prev !== folder) {
      if (entry.priority >= priority) return false;
      if (prev.node.index === entry.node) delete prev.node.index;
      else {
        const idx = prev.node.children.indexOf(entry.node);
        if (idx !== -1) prev.node.children.splice(idx, 1);
      }
    }
    entry.owner = folder;
    entry.priority = Math.max(entry.priority, priority);
    return true;
  }

  function buildFile(path: string): Entry<PageTree.Item> | undefined {
    const cached = entries.get(path);
    if (cached) return cached as Entry<PageTree.Item>;
    const file = storage.read(path);
    if (file?.format !== 'page') return;

    const { title, description, icon } = file.data;
    let node: PageTree.Item = {
      $id: createId(path),
      type: 'page',
      name: title ?? pathToName(basename(path, extname(path))),
      description,
      icon,
      url: options.url(file.slugs, locale),
      $ref: path,
    };
    for (const t of transformers) if (t.file) node = t.file.call(ctx, node, path);
    const entry: Entry<PageTree.Item> = { node, path, title, priority: 0, done: true };
    entries.set(path, entry);
    entryOf.set(node, entry);
    usedPages++;
    return entry;
  }

  function buildFolder(path: string, isGlobalRoot = false): Entry<PageTree.Folder> | undefined {
    const cached = entries.get(path);
    if (cached) return cached as Entry<PageTree.Folder>;
    const files = storage.readDir(path);
    if (!files) return;

    let metaPath: string | undefined = resolveFlattenPath(joinPath(path, 'meta'), 'meta');
    const metaFile = storage.read(metaPath);
    let meta: MetaData = {};
    if (metaFile?.format === 'meta') {
      meta = metaFile.data;
      metaPaths.add(metaPath);
    } else metaPath = undefined;

    const node: PageTree.Folder = {
      type: 'folder',
      name: null,
      root: meta.root,
      defaultOpen: meta.defaultOpen,
      description: meta.description,
      collapsible: meta.collapsible,
      children: [],
      $id: createId(path),
      $ref: { folder: path, meta: metaPath },
    };
    const self: Entry<PageTree.Folder> = { node, path, priority: 0, done: false };
    entries.set(path, self);

    const indexName = meta.pagesIndex || ((meta.root ?? isGlobalRoot) ? undefined : 'index');
    const indexPage = indexName && buildFile(resolveFlattenPath(joinPath(path, indexName), 'page'));
    let indexPath: string | undefined;
    if (indexPage && own(self, indexPage, meta.pagesIndex ? 3 : 0)) {
      node.index = indexPage.node;
      indexPath = indexPage.path;
    } else if (meta.pagesIndex) {
      node.index = resolveLink(meta.pagesIndex);
    }

    const items: (PageTree.Node | '...' | 'z...a')[] = [];
    const excluded = new Set<string>();
    for (const item of meta.pages ?? ['...']) {
      if (item === '...' || item === 'z...a') {
        items.push(item);
        continue;
      }

      const inline = resolveSeparator(item) ?? resolveLink(item);
      if (inline) {
        items.push(inline);
        continue;
      }

      if (item.startsWith('!')) {
        const target = joinPath(path, item.slice(1));
        excluded.add(target).add(resolveFlattenPath(target, 'page'));
        continue;
      }

      if (item.startsWith('...')) {
        const folder = buildFolder(joinPath(path, item.slice(3)));
        if (!folder) continue;
        const { index, children } = folder.node;
        const owned = own(self, folder, 2);
        if (owned) excluded.add(folder.path);

        for (const child of index ? [index, ...children] : children) {
          const entry = entryOf.get(child);
          if (entry && owned) entry.owner = self;
          else if (entry && !own(self, entry, 2)) continue;
          items.push(child);
        }
        continue;
      }

      const target = joinPath(path, item);
      const entry = buildFolder(target) ?? buildFile(resolveFlattenPath(target, 'page'));
      if (entry && own(self, entry, 2)) {
        items.push(entry.node);
        excluded.add(entry.path);
      }
    }

    if (indexPath) {
      if (excluded.has(indexPath)) delete node.index;
      else excluded.add(indexPath);
    }

    for (const item of items) {
      if (item === '...' || item === 'z...a') {
        for (const entry of buildRest(files, excluded, item === 'z...a')) {
          if (own(self, entry, 0)) node.children.push(entry.node);
        }
        continue;
      }

      // it may be taken by another folder while building this folder
      const entry = entryOf.get(item);
      if (!entry || entry.owner === self) node.children.push(item);
    }

    node.icon = meta.icon ?? node.index?.icon;
    node.name = meta.title ?? node.index?.name;
    self.title = meta.title ?? (node.index && entryOf.get(node.index)?.title);
    if (!node.name) {
      const name = basename(path);
      node.name = pathToName(group.exec(name)?.[1] ?? name);
    }

    let result = node;
    for (const t of transformers) if (t.folder) result = t.folder.call(ctx, result, path, metaPath);
    self.node = result;
    self.done = true;
    entryOf.set(result, self);
    return self;
  }

  /** build the remaining items of a folder for `...` */
  function buildRest(paths: string[], excluded: Set<string>, reversed: boolean): Entry[] {
    const out: Entry[] = [];
    let index: Entry | undefined;
    for (const path of paths) {
      if (excluded.has(path)) continue;
      const file = buildFile(path);
      if (file && !index && basename(path, extname(path)) === 'index') index = file;

      const entry = file ?? buildFolder(path);
      if (entry) out.push(entry);
    }

    const factor = reversed ? -1 : 1;
    return out.sort((a, b) => {
      if (a === index) return -1;
      if (b === index) return 1;
      const type = Number(a.node.type === 'folder') - Number(b.node.type === 'folder');
      return (
        factor * (type || compare((byName && a.title) || a.path, (byName && b.title) || b.path))
      );
    });
  }

  function resolveLink(item: string): PageTree.Item | undefined {
    const match = link.exec(item)?.groups;
    if (!match) return;

    let node: PageTree.Item = {
      $id: createId(),
      type: 'page',
      icon: match.icon,
      name: match.name,
      url: match.url,
      external: match.external ? true : undefined,
    };
    for (const t of transformers) if (t.file) node = t.file.call(ctx, node);
    return node;
  }

  function resolveSeparator(item: string): PageTree.Separator | undefined {
    const match = separator.exec(item)?.groups;
    if (!match) return;

    let node: PageTree.Separator = {
      $id: createId(),
      type: 'separator',
      icon: match.icon,
      name: match.name,
    };
    for (const t of transformers) if (t.separator) node = t.separator.call(ctx, node);
    return node;
  }

  function root(id = 'root', path = ''): PageTree.Root {
    const folder = buildFolder(path, true)?.node;
    if (options.noRef) for (const { node } of entries.values()) delete node.$ref;

    let out: PageTree.Root = {
      type: 'root',
      $ref: folder?.$ref,
      $id: createId(id),
      name: folder?.name || 'Docs',
      description: folder?.description,
      children: folder ? folder.children : [],
    };
    for (const t of transformers) if (t.root) out = t.root.call(ctx, out);

    if ((options.generateFallback ?? true) && usedPages + metaPaths.size < storage.files.size) {
      const unused = new FileSystem() as ContentStorage;
      for (const [path, file] of storage.files) {
        if (!entries.has(path) && !metaPaths.has(path)) unused.write(path, file);
      }

      out.fallback = createPageTreeBuilder(
        unused,
        {
          ...options,
          idPrefix: idPrefix ? `fallback:${idPrefix}` : 'fallback',
          generateFallback: false,
        },
        locale,
        storages,
      ).root();
    }

    return out;
  }

  return builder;
}

/**
 * Get item name from file name
 *
 * @param name - file name
 */
function pathToName(name: string): string {
  const [first = '', ...rest] = name;
  return first.toLocaleUpperCase() + rest.join('').replaceAll('-', ' ');
}
