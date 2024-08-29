import path from 'node:path';
import fs from 'node:fs/promises';
import grayMatter from 'gray-matter';
import { type LoaderContext } from 'webpack';
import type { InternalFrontmatter } from '@/types';
import { findCollection } from '@/utils/find-collection';
import { loadConfigCached } from '@/config/cached';
import { buildMDX } from '@/utils/build-mdx';
import { getDefaultMDXOptions, type TransformContext } from '@/config';
import { getGitTimestamp } from './utils/git-timestamp';

export interface Options {
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
  const { lastModifiedTime, _ctx } = this.getOptions();
  const config = await loadConfigCached(_ctx.configPath);
  const collection = findCollection(config, filePath, 'doc');
  const matter = grayMatter(source);

  const mdxOptions =
    collection?.mdxOptions ??
    getDefaultMDXOptions(config.global?.mdxOptions ?? {});

  function getTransformContext(): TransformContext {
    return {
      buildMDX: async (v, options = mdxOptions) => {
        const res = await buildMDX(v, options);
        return String(res.value);
      },
      source,
      path: filePath,
    };
  }

  let frontmatter = matter.data;
  if (collection?.schema) {
    const schema =
      typeof collection.schema === 'function'
        ? collection.schema(getTransformContext())
        : collection.schema;

    const result = await schema.safeParseAsync(frontmatter);
    if (result.error) {
      callback(result.error);
      return;
    }

    frontmatter = result.data;
  }

  const props = (matter.data as InternalFrontmatter)._mdx ?? {};
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

  try {
    const file = await buildMDX(matter.content, {
      development: this.mode === 'development',
      ...mdxOptions,
      filePath,
      frontmatter,
      outputFormat: 'program',
      data: {
        lastModified: timestamp,
      },
    });
    const info = this._module?.buildInfo as InternalBuildInfo;

    info.__fumadocs = {
      path: filePath,
      data: file.data,
    };

    callback(undefined, String(file.value), file.map ?? undefined);
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    const fpath = path.relative(context, filePath);
    error.message = `${fpath}:${error.name}: ${error.message}`;
    callback(error);
  }
}
