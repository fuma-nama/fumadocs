import path from 'node:path';
import fs from 'node:fs/promises';
import { createProcessor, type ProcessorOptions } from '@mdx-js/mdx';
import { type Processor } from '@mdx-js/mdx/internal-create-format-aware-processors';
import grayMatter from 'gray-matter';
import { type LoaderContext } from 'webpack';
import type { InternalFrontmatter } from '@/types';
import { findCollection } from '@/utils/find-collection';
import { loadConfigCached } from '@/config/cached';
import { getGitTimestamp } from './utils/git-timestamp';

export interface Options extends ProcessorOptions {
  /**
   * Fetch last modified time with specified version control
   * @defaultValue 'none'
   */
  lastModifiedTime?: 'git' | 'none';

  /**
   * @internal
   */
  _ctx: {
    configPath: string;
  };
}

export interface InternalBuildInfo {
  __fumadocs?: {
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
  const { lastModifiedTime, _ctx, ...options } = this.getOptions();
  const detectedFormat = filePath.endsWith('.mdx') ? 'mdx' : 'md';
  const format = options.format ?? detectedFormat;
  const config = await loadConfigCached(_ctx.configPath);
  const collection = findCollection(config, filePath, 'doc');

  let processor = cache.get(format);

  if (processor === undefined) {
    processor = createProcessor({
      ...options,
      development: this.mode === 'development',
      format,
    });

    cache.set(format, processor);
  }

  const matter = grayMatter(source);
  const parsedMatter = collection?.schema.parse(matter.data) ?? matter.data;
  const props = (parsedMatter as InternalFrontmatter)._mdx ?? {};

  if (props.mirror) {
    const mirrorPath = path.resolve(path.dirname(filePath), props.mirror);
    this.addDependency(mirrorPath);

    matter.content = await fs
      .readFile(mirrorPath)
      .then((res) => grayMatter(res.toString()).content);
  }

  let timestamp: number | undefined;
  if (lastModifiedTime === 'git')
    timestamp = (await getGitTimestamp(filePath))?.getTime();

  processor
    .process({
      value: matter.content,
      path: filePath,
      data: {
        lastModified: timestamp,
        frontmatter: parsedMatter,
      },
    })
    .then(
      (file) => {
        const info = this._module?.buildInfo as InternalBuildInfo;

        info.__fumadocs = {
          path: filePath,
          data: file.data,
        };

        callback(undefined, String(file.value), file.map ?? undefined);
      },
      (error: Error) => {
        const fpath = path.relative(context, filePath);
        error.message = `${fpath}:${error.name}: ${error.message}`;
        callback(error);
      },
    );
}
