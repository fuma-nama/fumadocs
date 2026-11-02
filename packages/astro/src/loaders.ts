import path from 'node:path';
import { glob, type Loader, type LoaderContext } from 'astro/loaders';
import { mdxToMdast, type MdastNode } from 'satteri';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { loaders, root } from 'virtual:fumadocs/config';
import type { ExtractedReference } from './source';

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
  return Object.assign(loader, { schema: pageSchema });
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
function withSet(store: Store, set: Store['set']): Store {
  return new Proxy(store, {
    get(target, key) {
      if (key === 'set') return set;
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
      [
        '-c',
        'core.quotepath=off',
        'log',
        '--format=commit %H %aI',
        '--name-only',
        '--relative',
        '--',
        '.',
      ],
      { cwd: dir, maxBuffer: Infinity },
      // without git, or the history, pages have no dates
      (error, out) => resolve(error ? '' : out),
    );
  });

  // newest first, the first date of a file is its last modified date
  const history: History = { dates: new Map() };
  let date: Date | undefined;
  for (const line of stdout.split('\n')) {
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
