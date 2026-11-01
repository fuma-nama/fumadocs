import { glob, type Loader, type LoaderContext } from 'astro/loaders';
import { mdxToMdast, type MdastNode } from 'satteri';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { loaders } from 'virtual:fumadocs/config';

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
  const { dir, extractLinkReferences } = getOptions(collection);
  const loader = glob({ base: dir, pattern: '**/*.mdx', generateId: ({ entry }) => entry });
  if (extractLinkReferences) {
    const load = loader.load;
    loader.load = (context) =>
      load({
        ...context,
        store: withReferences(context.store),
        // cached entries have no references, load them again
        generateDigest: (data) =>
          context.generateDigest(typeof data === 'string' ? `${data}\0references` : data),
      });
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

/** entries get `extractedReferences`, the links of their content like Fumadocs MDX */
function withReferences(store: Store): Store {
  const set: Store['set'] = (entry) =>
    store.set({
      ...entry,
      data: { ...entry.data, extractedReferences: entry.body ? getReferences(entry.body) : [] },
    });

  return new Proxy(store, {
    get(target, key) {
      if (key === 'set') return set;
      const value: unknown = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function getReferences(source: string): { href: string }[] {
  const out: { href: string }[] = [];
  const stack: MdastNode[] = [mdxToMdast(source)];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === 'link') out.push({ href: node.url });
    if ('children' in node)
      for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
  }
  return out;
}
