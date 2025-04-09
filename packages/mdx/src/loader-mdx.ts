import * as path from 'node:path';
import { parse } from 'node:querystring';
import grayMatter from 'gray-matter';
import { type LoaderContext } from 'webpack';
import { getConfigHash, loadConfig } from '@/utils/config';
import { buildMDX } from '@/utils/build-mdx';
import { getGitTimestamp } from './utils/git-timestamp';
import { validate } from '@/utils/schema';

export interface Options {
  /**
   * @internal
   */
  _ctx: {
    configPath: string;
  };
}

function parseQuery(query: string): {
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

  // notice that `resourceQuery` can be missing (e.g. `page.mdx`)
  const {
    hash: configHash = await getConfigHash(_ctx.configPath),
    collection: collectionId,
  } = parseQuery(this.resourceQuery);
  const config = await loadConfig(_ctx.configPath, configHash);

  let collection =
    collectionId !== undefined
      ? config.collections.get(collectionId)
      : undefined;

  if (collection && collection.type === 'docs') collection = collection.docs;
  if (collection && collection.type !== 'doc') {
    collection = undefined;
  }

  let mdxOptions = collection?.mdxOptions;

  if (!mdxOptions) {
    const { getDefaultMDXOptions } = await import('@/utils/mdx-options');
    config._mdx_loader ??= {};

    const extendedOptions = config.global?.mdxOptions;
    config._mdx_loader.cachedProcessorOptions ??=
      typeof extendedOptions === 'function'
        ? getDefaultMDXOptions(await extendedOptions())
        : getDefaultMDXOptions(extendedOptions ?? {});

    mdxOptions = config._mdx_loader.cachedProcessorOptions;
  }

  if (collection?.schema) {
    matter.data = (await validate(
      collection.schema,
      matter.data,
      {
        source,
        path: filePath,
      },
      `invalid frontmatter in ${filePath}`,
    )) as Record<string, unknown>;
  }

  let timestamp: number | undefined;
  if (config.global?.lastModifiedTime === 'git')
    timestamp = (await getGitTimestamp(filePath))?.getTime();

  try {
    // ensure the line number is correct in dev mode
    const lineOffset = '\n'.repeat(
      this.mode === 'development' ? lines(source) - lines(matter.content) : 0,
    );

    const file = await buildMDX(
      `${configHash}:${collectionId ?? 'global'}`,
      lineOffset + matter.content,
      {
        development: this.mode === 'development',
        ...mdxOptions,
        filePath,
        frontmatter: matter.data,
        data: {
          lastModified: timestamp,
        },
        _compiler: this,
      },
    );

    callback(undefined, String(file.value), file.map ?? undefined);
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    const fpath = path.relative(context, filePath);
    error.message = `${fpath}:${error.name}: ${error.message}`;
    callback(error);
  }
}

function lines(s: string) {
  let num = 0;

  for (const c of s) {
    if (c === '\n') num++;
  }

  return num;
}
