import path from 'node:path';
import fs from 'node:fs/promises';
import { parse } from 'node:querystring';
import grayMatter from 'gray-matter';
import { type LoaderContext } from 'webpack';
import type { InternalFrontmatter } from '@/types';
import { findCollection } from '@/utils/find-collection';
import { invalidateCache, loadConfigCached } from '@/config/cached';
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

function getQuery(query: string): {
  collection?: string;
  hash?: string;
} {
  let collection: string | undefined;
  let hash: string | undefined;
  const parsed = parse(query.slice(1));

  if (parsed.collection && typeof parsed.collection === 'string')
    collection = parsed.collection;

  if (parsed.hash && typeof parsed.hash === 'string') hash = parsed.hash;

  return { collection, hash };
}

// hash start from zero
const hashes = new Set<string>(['0']);

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
  const context = this.context;
  const filePath = this.resourcePath;
  // notice that `resourceQuery` can be missing (e.g. on Turbopack)
  const { hash, collection: collectionId } = getQuery(this.resourceQuery);
  const { lastModifiedTime, _ctx } = this.getOptions();
  const matter = grayMatter(source);
  this.cacheable(true);

  if (hash === undefined || !hashes.has(hash)) {
    invalidateCache(_ctx.configPath);
    if (hash) hashes.add(hash);
  }

  const config = await loadConfigCached(_ctx.configPath);
  const collection =
    collectionId !== undefined
      ? config.collections.get(collectionId)
      : findCollection(config, filePath, 'doc');

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

    frontmatter = result.data as Record<string, unknown>;
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

    const info = this._module?.buildInfo as InternalBuildInfo | undefined;

    if (info)
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
