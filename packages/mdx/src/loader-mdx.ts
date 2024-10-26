import path from 'node:path';
import fs from 'node:fs/promises';
import { parse } from 'node:querystring';
import grayMatter from 'gray-matter';
import { type LoaderContext } from 'webpack';
import { type StructuredData } from 'fumadocs-core/mdx-plugins';
import { getConfigHash, loadConfigCached } from '@/config/cached';
import { buildMDX } from '@/utils/build-mdx';
import { getDefaultMDXOptions, type TransformContext } from '@/config';
import { getManifestEntryPath } from '@/map/manifest';
import { formatError } from '@/utils/format-error';
import { getGitTimestamp } from './utils/git-timestamp';

export interface Options {
  /**
   * @internal
   */
  _ctx: {
    configPath: string;
  };
}

interface InternalFrontmatter {
  _mdx?: {
    /**
     * Mirror another MDX file
     */
    mirror?: string;
  };
}

export interface MetaFile {
  path: string;
  data: {
    frontmatter: Record<string, unknown>;
    structuredData?: StructuredData;
    [key: string]: unknown;
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
  const { _ctx } = this.getOptions();
  const matter = grayMatter(source);

  // notice that `resourceQuery` can be missing (e.g. on Turbopack)
  const query = getQuery(this.resourceQuery);
  const configHash = query.hash ?? (await getConfigHash(_ctx.configPath));
  const config = await loadConfigCached(_ctx.configPath, configHash);
  const collectionId = query.collection;

  let collection =
    collectionId !== undefined
      ? config.collections.get(collectionId)
      : undefined;

  if (collection && collection.type !== 'doc') {
    collection = undefined;
  }

  const mdxOptions =
    collection?.mdxOptions ??
    getDefaultMDXOptions(config.global?.mdxOptions ?? {});

  function getTransformContext(): TransformContext {
    return {
      buildMDX: async (v, options = mdxOptions) => {
        const res = await buildMDX(
          collectionId ?? 'global',
          configHash,
          v,
          options,
        );
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
      callback(new Error(formatError(filePath, result.error)));
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
  if (config.global?.lastModifiedTime === 'git')
    timestamp = (await getGitTimestamp(filePath))?.getTime();

  try {
    const file = await buildMDX(
      collectionId ?? 'global',
      configHash,
      matter.content,
      {
        development: this.mode === 'development',
        ...mdxOptions,
        filePath,
        frontmatter,
        data: {
          lastModified: timestamp,
        },
      },
    );

    callback(undefined, String(file.value), file.map ?? undefined);

    if (config.global?.generateManifest) {
      await fs.mkdir('.next/cache/fumadocs', { recursive: true });
      await fs.writeFile(
        getManifestEntryPath(filePath),
        JSON.stringify({
          path: filePath,
          data: file.data,
        } as MetaFile),
      );
    }
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    const fpath = path.relative(context, filePath);
    error.message = `${fpath}:${error.name}: ${error.message}`;
    callback(error);
  }
}
