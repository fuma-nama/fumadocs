import { glob, type Loader } from 'astro/loaders';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { dirs } from 'virtual:fumadocs/config';

function getDir(collection: string): string {
  const dir = dirs[collection];
  if (!dir)
    throw new Error(
      `Collection "${collection}" is not in the \`collections\` option of the Fumadocs integration.`,
    );
  return dir;
}

/**
 * Load the MDX files of a Fumadocs collection, entry IDs are the file paths.
 *
 * Their schema is `pageSchema`, unless the content collection defines one.
 */
export function pageLoader(collection = 'docs'): Loader & { schema: typeof pageSchema } {
  return Object.assign(
    glob({ base: getDir(collection), pattern: '**/*.mdx', generateId: ({ entry }) => entry }),
    { schema: pageSchema },
  );
}

/**
 * Load the meta files (`meta.json`) of a Fumadocs collection, entry IDs are the file paths.
 *
 * Their schema is `metaSchema`, unless the content collection defines one.
 */
export function metaLoader(collection = 'docs'): Loader & { schema: typeof metaSchema } {
  return Object.assign(
    glob({
      base: getDir(collection),
      pattern: '**/*.{json,yaml}',
      generateId: ({ entry }) => entry,
    }),
    { schema: metaSchema },
  );
}
