import { glob, type Loader } from 'astro/loaders';
import { collections } from 'virtual:fumadocs/config';

function getDir(collection: string): string {
  const options = collections[collection];
  if (!options)
    throw new Error(
      `Collection "${collection}" is not in the \`collections\` option of the Fumadocs integration.`,
    );
  return options.dir;
}

/**
 * Load the MDX files of a Fumadocs collection, entry IDs are the file paths.
 */
export function pageLoader(collection = 'docs'): Loader {
  return glob({ base: getDir(collection), pattern: '**/*.mdx', generateId: ({ entry }) => entry });
}

/**
 * Load the meta files (`meta.json`) of a Fumadocs collection, entry IDs are the file paths.
 */
export function metaLoader(collection = 'docs'): Loader {
  return glob({
    base: getDir(collection),
    pattern: '**/*.{json,yaml}',
    generateId: ({ entry }) => entry,
  });
}
