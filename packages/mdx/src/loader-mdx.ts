import path from 'node:path';
import { createProcessor, type ProcessorOptions } from '@mdx-js/mdx';
import type { Processor } from '@mdx-js/mdx/lib/core';
import grayMatter from 'gray-matter';
import { type LoaderContext } from 'webpack';
import { getGitTimestamp } from './utils/git-timestamp';

export interface Options extends ProcessorOptions {
  /**
   * Fetch last modified time with specified version control
   * @defaultValue 'none'
   */
  lastModifiedTime?: 'git' | 'none';
}

export interface NextDocsBuildInfo {
  __next_docs?: {
    path: string;
    /**
     * `vfile.data` parsed from file
     */
    data: unknown;
  };
}

const cache = new Map<string, Processor>();

/**
 * Load MDX/markdown files
 *
 * it supports frontmatter by parsing and injecting the data in `vfile.data.frontmatter`
 */
export default async function loader(
  this: LoaderContext<Options>,
  source: string,
  callback: LoaderContext<Options>['callback'],
): Promise<void> {
  this.cacheable(true);
  const context = this.context;
  const filePath = this.resourcePath;
  const options = this.getOptions();
  const { content, data: frontmatter } = grayMatter(source);
  const format = options.format ?? filePath.endsWith('.mdx') ? 'mdx' : 'md';
  let timestamp: number | undefined;
  let processor = cache.get(format);

  if (options.lastModifiedTime === 'git')
    timestamp = (await getGitTimestamp(filePath))?.getTime();

  if (!processor) {
    processor = createProcessor({
      format,
      development: this.mode === 'development',
      ...options,
    });

    cache.set(format, processor);
  }

  processor
    .process({
      value: content,
      path: filePath,
      data: {
        lastModified: timestamp,
        frontmatter,
      },
    })
    .then(
      (file) => {
        const info = this._module?.buildInfo as NextDocsBuildInfo;

        info.__next_docs = {
          path: filePath,
          data: file.data,
        };

        callback(undefined, String(file.value), file.map || undefined);
      },
      (error: Error) => {
        const fpath = path.relative(context, filePath);
        error.message = `${fpath}:${error.name}: ${error.message}`;
        callback(error);
      },
    );
}
