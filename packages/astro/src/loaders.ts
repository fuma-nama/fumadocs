import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { DataEntryType } from 'astro';
import { glob, type Loader, type LoaderContext, type ParseDataOptions } from 'astro/loaders';
import { mdxToMdast, type MdastNode } from 'satteri';
import { getStaticParams, type MetaData, type Params } from 'fumadocs-core/source';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { loaders, root } from 'virtual:fumadocs/config';
import { metaModule } from '../../shared/frontmatter-code';
import { frontmatterQuery, hasFrontmatterCode, metaQuery } from './shared';
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
  const load = loader.load;
  loader.load = async (context) => {
    const base = path.resolve(root, dir);
    const history = lastModified ? await getHistory(base) : undefined;
    const { store } = context;
    // cached entries keep the data they were set with, they load again when it changes
    const version = `${extractLinkReferences ? 'references' : ''}\0${history?.head ?? ''}`;
    return load({
      ...context,
      parseData: (props) => parsePage(context, base, props),
      store: withSet(store, (entry) => {
        const data: Record<string, unknown> = { ...entry.data };
        if (extractLinkReferences)
          data.extractedReferences = entry.body ? getReferences(entry.body) : [];
        if (history) data.lastModified = history.dates.get(entry.id);
        return store.set({ ...entry, data });
      }),
      generateDigest: (data) =>
        context.generateDigest(
          typeof data === 'string'
            ? // the frontmatter in code reads other files, like meta files and its imports
              `${data}\0${version}${hasFrontmatterCode(data) ? `\0${Date.now()}` : ''}`
            : data,
        ),
    });
  };
  return Object.assign(loader, { schema: pageSchema });
}

/**
 * Like Fumadocs MDX, the frontmatter in code runs over the frontmatter for the page of a file, or each listed params
 * of a dynamic file, validated by the schema.
 */
async function parsePage<Data extends Record<string, unknown>>(
  context: LoaderContext,
  base: string,
  props: ParseDataOptions<Data>,
): Promise<Data> {
  const { filePath, data } = props;
  // through Vite, which loads the frontmatter in code as a module
  const { frontmatter: run } =
    filePath && hasFrontmatterCode(await fs.readFile(filePath, 'utf8'))
      ? ((await import(
          /* @vite-ignore */ `${filePath.replaceAll(path.sep, '/')}${frontmatterQuery}`
        )) as { frontmatter?: (params?: Params) => Record<string, unknown> })
      : {};
  if (!run) return context.parseData(props);
  const file = path.relative(base, filePath!).replaceAll(path.sep, '/');
  const staticParams = await listParams(context, base, file, data.staticParams as Params[]);
  if (!staticParams) return context.parseData({ ...props, data: { ...data, ...run() } });

  const at: Record<string, unknown> = {};
  for (const params of staticParams)
    at[JSON.stringify(params)] = await context.parseData({
      ...props,
      data: { ...data, ...run(params) },
    });
  return { ...data, _frontmatterAt: at };
}

/** the data of a meta module -> its data at the params of its folder */
const dataAts = new WeakMap<object, (params: Params) => MetaData>();

/** a meta module, like `meta.ts`, runs through Vite */
const moduleEntryType: DataEntryType = {
  extensions: ['.ts', '.js'],
  async getEntryInfo({ fileUrl }) {
    const file = fileURLToPath(fileUrl).replaceAll(path.sep, '/');
    const { data, dataAt } = metaModule<MetaData & Record<string, unknown>>(
      await import(/* @vite-ignore */ `${file}${metaQuery}`),
    );
    if (dataAt) dataAts.set(data, dataAt);
    return { data };
  },
};

/** `glob()` parses files with them, they aren't in the type of the context */
type EntryTypes = Map<string, DataEntryType>;

/**
 * The listed params of a dynamic file, with the meta files in its folders parsed like the meta collection. `undefined`
 * when the file isn't dynamic.
 */
async function listParams(
  context: LoaderContext,
  base: string,
  file: string,
  staticParams?: Params[],
): Promise<Params[] | undefined> {
  const { entryTypes } = context as LoaderContext & { entryTypes: EntryTypes };
  const lists = new Map<string, Params[] | undefined>();
  // the meta files that it reads, without its own list as it can lack the names they list, then their contents
  getStaticParams(file, { readStaticParams: (meta) => void lists.set(meta, undefined) });
  for (const meta of lists.keys())
    for (const ext of ['.json', '.yaml', '.ts', '.js']) {
      const fileUrl = pathToFileURL(path.join(base, meta + ext));
      const contents = await fs.readFile(fileUrl, 'utf8').catch(() => undefined);
      if (contents === undefined) continue;
      const type = entryTypes.get(ext) ?? moduleEntryType;
      const { data } = await type.getEntryInfo({ contents, fileUrl });
      lists.set(meta, (data as MetaData).staticParams);
      break;
    }
  return getStaticParams(file, { staticParams, readStaticParams: (meta) => lists.get(meta) });
}

/**
 * Load the meta files (`meta.json`) of a Fumadocs collection, entry IDs are the file paths.
 *
 * Like Fumadocs MDX, a meta file can be a module, like `meta.ts`, whose default export can be a function of the params
 * of its folder: it runs for each listed params.
 *
 * Their schema is `metaSchema`, unless the content collection defines one.
 */
export function metaLoader(collection = 'docs'): Loader & { schema: typeof metaSchema } {
  const { dir } = getOptions(collection);
  const loader = glob({
    base: dir,
    pattern: '**/{*.{json,yaml},meta{,.*}.{js,ts}}',
    generateId: ({ entry }) => entry,
  });
  const load = loader.load;
  loader.load = (context) => {
    const base = path.resolve(root, dir);
    const { entryTypes } = context as LoaderContext & { entryTypes: EntryTypes };
    return load({
      ...context,
      entryTypes: new Map([...entryTypes, ['.ts', moduleEntryType], ['.js', moduleEntryType]]),
      async parseData(props) {
        const { data } = props;
        const dataAt = dataAts.get(data);
        if (!dataAt) return context.parseData(props);
        const file = path.relative(base, props.filePath!).replaceAll(path.sep, '/');
        const at: Record<string, unknown> = {};
        for (const params of (await listParams(context, base, file)) ?? [])
          at[JSON.stringify(params)] = await context.parseData({
            ...props,
            data: { ...data, ...dataAt(params) },
          });
        return { ...data, _dataAt: at } as never;
      },
      // a module reads other files, like its imports and meta files
      generateDigest: (data) =>
        context.generateDigest(
          typeof data === 'string' && /^export\b/m.test(data) ? `${data}\0${Date.now()}` : data,
        ),
    } as LoaderContext);
  };
  return Object.assign(loader, { schema: metaSchema });
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
