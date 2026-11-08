import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { glob, type Loader, type LoaderContext } from 'astro/loaders';
import { mdxToMdast, type MdastNode } from 'satteri';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { loaders, root } from 'virtual:fumadocs/config';
import { getStaticParams, isDynamicPath, type MetaData, type PageData } from 'fumadocs-core/source';
import type { ExtractedReference } from './source';
import { dynamicPageFile, dynamicPageKey } from './shared';

function getOptions(collection: string) {
  const options = loaders[collection];
  if (!options)
    throw new Error(
      `Collection "${collection}" is not in the \`collections\` option of the Fumadocs integration.`,
    );
  return options;
}

/**
 * Load the MDX files of a Fumadocs collection, entry IDs are the file paths.
 *
 * Their schema is `pageSchema`, unless the content collection defines one.
 */
export function pageLoader(collection = 'docs'): Loader & { schema: typeof pageSchema } {
  const { dir, extractLinkReferences, lastModified } = getOptions(collection);
  const loader = glob({ base: dir, pattern: '**/*.mdx', generateId: ({ entry }) => entry });
  if (extractLinkReferences || lastModified) {
    const load = loader.load;
    loader.load = async (context) => {
      const history = lastModified ? await getHistory(path.resolve(root, dir)) : undefined;
      const { store } = context;
      // cached entries keep the data they were set with, they load again when it changes
      const version = `${extractLinkReferences ? 'references' : ''}\0${history?.head ?? ''}`;
      return load({
        ...context,
        store: withSet(store, (entry) => {
          const data: Record<string, unknown> = { ...entry.data };
          if (extractLinkReferences)
            data.extractedReferences = entry.body ? getReferences(entry.body) : [];
          if (history) data.lastModified = history.dates.get(entry.id);
          return store.set({ ...entry, data });
        }),
        generateDigest: (data) =>
          context.generateDigest(typeof data === 'string' ? `${data}\0${version}` : data),
      });
    };
  }
  const load = loader.load;
  loader.load = async (context) => {
    const pages = createDynamicPages(context.store, path.resolve(root, dir));
    await load({ ...context, store: withSet(context.store, pages.set, pages.delete) });
    pages.sync();
    context.watcher?.on('all', (_event, file) => pages.onChange(file));
  };
  return Object.assign(loader, { schema: pageSchema });
}

type Entry = Parameters<Store['set']>[0];

/**
 * The entries of the pages of dynamic files, one for each of their params, compiled from a virtual file. They are
 * written after the glob loader syncs, which deletes the entries that aren't its files.
 */
function createDynamicPages(store: Store, dir: string) {
  const metaFiles = new Set<string>();
  /** entry ID of a dynamic file -> the entry IDs of its pages */
  const pages = new Map<string, string[]>();
  let synced = false;

  function write(entry: Entry) {
    if (!synced || !entry.filePath || !isDynamicPath(entry.id) || dynamicPageKey in entry.data)
      return;
    remove(entry.id);
    const staticParams = getStaticParams(entry.id, {
      staticParams: (entry.data as PageData).staticParams,
      readStaticParams(file) {
        for (const ext of ['.json', '.yaml']) {
          const metaFile = path.join(dir, file + ext);
          metaFiles.add(metaFile);
          let content: string;
          try {
            content = fs.readFileSync(metaFile, 'utf-8');
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
            throw error;
          }
          return (parse(content) as MetaData | null)?.staticParams;
        }
      },
    });

    const ids: string[] = [];
    pages.set(entry.id, ids);
    for (const params of staticParams ?? []) {
      const id = `${entry.id}#${JSON.stringify(params)}`;
      ids.push(id);
      store.set({
        ...entry,
        id,
        filePath: dynamicPageFile(entry.filePath, params),
        data: { ...entry.data, [dynamicPageKey]: { id: entry.id, params } },
        deferredRender: true,
      });
    }
  }

  function remove(id: string) {
    for (const page of pages.get(id) ?? []) store.delete(page);
    pages.delete(id);
  }

  function sync() {
    synced = true;
    for (const entry of store.values()) write(entry as Entry);
  }

  return {
    set(entry: Entry) {
      const out = store.set(entry);
      write(entry);
      return out;
    },
    delete(id: string) {
      remove(id);
      store.delete(id);
    },
    sync,
    onChange(file: string) {
      if (synced && metaFiles.has(file)) sync();
    },
  };
}

/**
 * Load the meta files (`meta.json`) of a Fumadocs collection, entry IDs are the file paths.
 *
 * Their schema is `metaSchema`, unless the content collection defines one.
 */
export function metaLoader(collection = 'docs'): Loader & { schema: typeof metaSchema } {
  return Object.assign(
    glob({
      base: getOptions(collection).dir,
      pattern: '**/*.{json,yaml}',
      generateId: ({ entry }) => entry,
    }),
    { schema: metaSchema },
  );
}

type Store = LoaderContext['store'];

/** entries get the data of the collection options, like Fumadocs MDX */
function withSet(store: Store, set: Store['set'], remove?: Store['delete']): Store {
  return new Proxy(store, {
    get(target, key) {
      if (key === 'set') return set;
      if (key === 'delete' && remove) return remove;
      const value: unknown = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function getReferences(source: string): ExtractedReference[] {
  const out: ExtractedReference[] = [];
  const stack: MdastNode[] = [mdxToMdast(source)];
  let node: MdastNode | undefined;
  while ((node = stack.pop())) {
    if (node.type === 'link') out.push({ href: node.url });
    if ('children' in node)
      for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
  }
  return out;
}

/** the git history of a directory, its file paths are relative to it */
interface History {
  /** the last commit */
  head?: string;
  /** the date of the last commit by file */
  dates: Map<string, Date>;
}

/** one `git log` for the content directory */
async function getHistory(dir: string): Promise<History> {
  // dynamic, as server bundles of some adapters have no `child_process`
  const { execFile } = await import('node:child_process');
  const stdout = await new Promise<string>((resolve) => {
    execFile(
      'git',
      // `-z`: file names as they are, unquoted
      ['log', '-z', '--format=commit %H %aI', '--name-only', '--relative', '--', '.'],
      { cwd: dir, maxBuffer: Infinity },
      // without git, or the history, pages have no dates
      (error, out) => resolve(error ? '' : out),
    );
  });

  // newest first, the first date of a file is its last modified date
  const history: History = { dates: new Map() };
  let date: Date | undefined;
  for (let line of stdout.split('\0')) {
    // the file names of a commit start on the line after its header
    if (line.startsWith('\n')) line = line.slice(1);
    if (line.startsWith('commit ')) {
      const [, hash, iso] = line.split(' ');
      history.head ??= hash;
      date = new Date(iso);
    } else if (line && date && !history.dates.has(line)) {
      history.dates.set(line, date);
    }
  }
  return history;
}
