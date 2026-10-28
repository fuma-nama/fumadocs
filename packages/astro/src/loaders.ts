import { glob, type Loader } from 'astro/loaders';
import { dir } from 'virtual:fumadocs/config';

/**
 * Load the MDX files in the `dir` of the Fumadocs integration, entry IDs are the file paths.
 */
export function docsLoader(): Loader {
  return glob({ base: dir, pattern: '**/*.mdx', generateId: ({ entry }) => entry });
}

/**
 * Load the meta files (`meta.json`) in the `dir` of the Fumadocs integration, entry IDs are the file paths.
 */
export function metaLoader(): Loader {
  return glob({ base: dir, pattern: '**/*.{json,yaml}', generateId: ({ entry }) => entry });
}
