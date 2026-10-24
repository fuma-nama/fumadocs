import { glob, type Loader } from 'astro/loaders';

export interface LoaderOptions {
  /**
   * Content directory, relative to the project root.
   *
   * @defaultValue 'content/docs'
   */
  dir?: string;
}

/**
 * Load the MDX files of a content directory, entry IDs are the file paths.
 */
export function docsLoader({ dir = 'content/docs' }: LoaderOptions = {}): Loader {
  return glob({ base: dir, pattern: '**/*.mdx', generateId: ({ entry }) => entry });
}

/**
 * Load the meta files (`meta.json`) of a content directory, entry IDs are the file paths.
 */
export function metaLoader({ dir = 'content/docs' }: LoaderOptions = {}): Loader {
  return glob({ base: dir, pattern: '**/*.{json,yaml}', generateId: ({ entry }) => entry });
}
