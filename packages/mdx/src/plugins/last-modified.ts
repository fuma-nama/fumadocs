import type { Plugin } from '@/core';
import type { LastModifiedFn } from '@/loaders/mdx/last-modified';

export interface LastModifiedPluginOptions {
  /**
   * Version control to obtain the last modified time.
   *
   * - `git`: Requires `git` to be installed.
   *
   *    If you are using Vercel, please set `VERCEL_DEEP_CLONE` environment variable to `true`.
   *
   * - A function: return the last modified time for given file path.
   *
   * @defaultValue 'git'
   */
  versionControl?: 'git' | LastModifiedFn;

  /**
   * Filter the collections to include by names
   */
  filter?: (collection: string) => boolean;
}

/**
 * Enable the `lastModified` option on doc collections.
 *
 * This is a shorthand for setting `lastModified` on each collection, collections that set it
 * themselves are left untouched.
 */
export default function lastModified(options: LastModifiedPluginOptions = {}): Plugin {
  const { versionControl = 'git', filter = () => true } = options;

  return {
    name: 'last-modified',
    config(config) {
      for (const collection of config.collections.values()) {
        if (!filter(collection.name)) continue;

        const docs =
          collection.type === 'doc'
            ? collection
            : collection.type === 'docs'
              ? collection.docs
              : undefined;
        if (docs) docs.lastModified ??= versionControl === 'git' ? true : versionControl;
      }
    },
  };
}
